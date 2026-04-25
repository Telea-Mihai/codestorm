import fitz  # PyMuPDF
import io
import asyncio
import time
import json
import re
import os
from datetime import datetime
import pymupdf4llm
from PIL import Image
from google import genai
from google.genai import types

# Rate limiter configuration for Google API free tier
# Free tier is strict; these defaults prioritize completion over speed.
MAX_CONCURRENT_REQUESTS = 1
MIN_REQUEST_INTERVAL = 6
DEFAULT_IMAGE_RETRIES = 8
BASE_BACKOFF_SECONDS = 8
MAX_BACKOFF_SECONDS = 120
MODEL_FALLBACK_CHAIN = [
    'gemini-2.5-flash-lite',
    'gemini-2.5-flash',
    'gemini-2.0-flash',
]

class RateLimiter:
    """Rate limiter for Google API requests with backoff support"""
    def __init__(self, max_concurrent=MAX_CONCURRENT_REQUESTS, min_interval=MIN_REQUEST_INTERVAL):
        self.semaphore = asyncio.Semaphore(max_concurrent)
        self.min_interval = min_interval
        self.last_request_time = 0
        self.lock = asyncio.Lock()
    
    async def acquire(self):
        """Acquire a slot, respecting rate limits"""
        async with self.lock:
            # Wait for minimum interval between requests
            elapsed = time.time() - self.last_request_time
            if elapsed < self.min_interval:
                await asyncio.sleep(self.min_interval - elapsed)
            self.last_request_time = time.time()
        
        await self.semaphore.acquire()
    
    def release(self):
        """Release a slot"""
        self.semaphore.release()



def _get_retry_after_seconds(error_message):
    """Extract retry-after seconds from error text when available."""
    if not error_message:
        return None

    match = re.search(r"retry\s*after\s*(\d+)", error_message, flags=re.IGNORECASE)
    if match:
        return int(match.group(1))

    return None

async def parseMarkdownAsync(path):
    """Parse PDF to markdown asynchronously using thread pool"""
    loop = asyncio.get_event_loop()
    
    def _parse_markdown():
        try:
            markdown = pymupdf4llm.to_markdown(path)
            return markdown
        except Exception as e:
            print(f"Error parsing markdown: {str(e)}")
            return ""
    
    markdown = await loop.run_in_executor(None, _parse_markdown)
    return markdown

async def imageToTextAsync(image_bytes, page_index, img_index, rate_limiter, retries=DEFAULT_IMAGE_RETRIES):
    """Async version of imageToText with exponential backoff for rate limits"""
    await rate_limiter.acquire()
    
    try:
        client = genai.Client()
        model_index = 0

        for attempt in range(retries):
            current_model = MODEL_FALLBACK_CHAIN[model_index]
            try:
                response = client.models.generate_content(
                    model=current_model,
                    contents=[
                        types.Part.from_bytes(
                            data=image_bytes,
                            mime_type='image/jpeg',
                        ),
                        'Caption this image. In the case of text, return the text content in markdown format. If the image contains a table, extract the table data and return it in markdown format. In case of text, DO NOT CHANGE THE CONTENT OR FORMAT, just return the text as is. If the image contains a table, return the table in markdown format, preserving the structure and content as accurately as possible. If the image is not clear enough to extract meaningful information, return a message indicating that the content could not be extracted.'
                    ]
                )
                return {
                    'page': page_index,
                    'image_index': img_index,
                    'text': response.text,
                    'status': 'success',
                    'model': current_model
                }
            except Exception as e:
                error_str = str(e).lower()
                # Check for rate limit errors
                if 'rate' in error_str or '429' in error_str or 'quota' in error_str:
                    if attempt < retries - 1:
                        next_model = MODEL_FALLBACK_CHAIN[(model_index + 1) % len(MODEL_FALLBACK_CHAIN)]
                        # Prefer server hint when available, otherwise exponential backoff.
                        retry_after = _get_retry_after_seconds(str(e))
                        computed_backoff = min(BASE_BACKOFF_SECONDS * (2 ** attempt), MAX_BACKOFF_SECONDS)
                        backoff_time = retry_after if retry_after is not None else computed_backoff
                        print(
                            f"Rate limited on image {img_index} (page {page_index}) with {current_model}. "
                            f"Retrying in {backoff_time}s using {next_model}..."
                        )
                        model_index = (model_index + 1) % len(MODEL_FALLBACK_CHAIN)
                        await asyncio.sleep(backoff_time)
                        continue
                    else:
                        print(
                            f"Failed to process image {img_index} (page {page_index}) after {retries} attempts "
                            f"(last model: {current_model}): {str(e)}"
                        )
                        return {
                            'page': page_index,
                            'image_index': img_index,
                            'text': None,
                            'status': 'failed',
                            'model': current_model,
                            'error': str(e)
                        }
                else:
                    # Non-rate-limit error, don't retry
                    print(
                        f"Error processing image {img_index} (page {page_index}) with {current_model}: {str(e)}"
                    )
                    return {
                        'page': page_index,
                        'image_index': img_index,
                        'text': None,
                        'status': 'failed',
                        'model': current_model,
                        'error': str(e)
                    }
    finally:
        rate_limiter.release()

async def extractImagesAsync(path, rate_limiter):
    """Extract all images from PDF and create processing tasks"""
    file = fitz.open(path)
    tasks = []
    
    for page_index in range(len(file)):
        page = file.load_page(page_index)
        image_list = page.get_images(full=True)
        
        for img_index, img in enumerate(image_list):
            try:
                xref = img[0]
                base_image = file.extract_image(xref)
                image_bytes = base_image["image"]
                
                # Create async task for this image
                task = imageToTextAsync(image_bytes, page_index, img_index, rate_limiter )
                tasks.append(task)
            except Exception as e:
                print(f"Error extracting image {img_index} on page {page_index}: {str(e)}")
    
    return tasks, file

def mergeMarkdownWithImages(markdown, image_results):
    """Replace image markers in markdown with actual image content"""
    def _strip_json_from_text(text):
        if not text:
            return ""

        # Remove fenced JSON blocks first.
        cleaned = re.sub(r"```json\s*.*?\s*```", "", text, flags=re.IGNORECASE | re.DOTALL)

        # If a line is pure JSON object/array, skip it from markdown output.
        kept_lines = []
        for line in cleaned.splitlines():
            stripped = line.strip()
            if (stripped.startswith("{") and stripped.endswith("}")) or (
                stripped.startswith("[") and stripped.endswith("]")
            ):
                continue
            kept_lines.append(line)

        return "\n".join(kept_lines).strip()

    # Sort images by page and index for proper ordering
    sorted_images = sorted(image_results, key=lambda x: (x['page'], x['image_index']))
    
    # Build a mapping of image references to content
    image_map = {}
    for idx, img in enumerate(sorted_images):
        image_map[f"page_{img['page']}_img_{img['image_index']}"] = img
    
    # Replace image markers with content
    merged_md = markdown
    for idx, img in enumerate(sorted_images):
        if img['status'] == 'success' and img['text']:
            cleaned_text = _strip_json_from_text(img['text'])
            # Create a section for this image
            image_section = f"\n### Image from Page {img['page'] + 1} #{img['image_index'] + 1}\n\n{cleaned_text if cleaned_text else '*See JSON output for structured image data.*'}\n"
            # Try to find and replace image references, or append at the end
            merged_md += image_section
        else:
            error_msg = img.get('error', 'Unknown error')
            merged_md += f"\n### Image from Page {img['page'] + 1} #{img['image_index'] + 1}\n\n*Failed to process: {error_msg}*\n"
    
    return merged_md

async def parsePDFAsync(path, output_dir=None):
    """
    Async PDF parsing with concurrent markdown and image processing.
    
    Args:
        path: Path to PDF file
        output_dir: Directory to save output files (default: same as PDF)
    
    Returns:
        Dict with paths to saved files and processing results
    """
    if output_dir is None:
        output_dir = os.path.dirname(path) or '.'
    
    # Create output directory if it doesn't exist
    os.makedirs(output_dir, exist_ok=True)
    
    # Get base filename without extension
    base_filename = os.path.splitext(os.path.basename(path))[0]
    timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
    
    print("Starting concurrent markdown parsing and image extraction...")
    rate_limiter = RateLimiter()
    # Run markdown parsing and image extraction concurrently
    markdown_task = parseMarkdownAsync(path)
    image_tasks, pdf_file = await extractImagesAsync(path, rate_limiter)
    
    # Wait for markdown to finish
    markdown = await markdown_task
    print(f"Markdown parsing complete: {len(markdown)} characters")
    
    # Process images concurrently
    if image_tasks:
        print(f"Processing {len(image_tasks)} images asynchronously...")
        image_results = await asyncio.gather(*image_tasks, return_exceptions=True)
        
        # Filter out exceptions and process results
        processed_images = []
        for result in image_results:
            if isinstance(result, Exception):
                print(f"Task failed with exception: {result}")
            else:
                processed_images.append(result)
                if result['status'] == 'success':
                    print(f"✓ Image {result['image_index']} on page {result['page']}: Success")
                else:
                    print(f"✗ Image {result['image_index']} on page {result['page']}: {result.get('error', 'Unknown error')}")
    else:
        print("No images found in PDF")
        processed_images = []
    
    # Merge markdown with image content
    print("Merging markdown with image content...")
    final_markdown = mergeMarkdownWithImages(markdown, processed_images)
    
    # Save markdown file
    md_filename = f"{base_filename}_extracted_{timestamp}.md"
    md_path = os.path.join(output_dir, md_filename)
    with open(md_path, 'w', encoding='utf-8') as f:
        f.write(final_markdown)
    print(f"✓ Saved markdown: {md_path}")
    
    # Save JSON file with image data
    json_data = {
        'source_pdf': path,
        'extraction_timestamp': timestamp,
        'total_images': len(processed_images),
        'successful_images': sum(1 for img in processed_images if img['status'] == 'success'),
        'failed_images': sum(1 for img in processed_images if img['status'] == 'failed'),
        'images': processed_images
    }
    json_filename = f"{base_filename}_images_{timestamp}.json"
    json_path = os.path.join(output_dir, json_filename)
    with open(json_path, 'w', encoding='utf-8') as f:
        json.dump(json_data, f, indent=2, ensure_ascii=False)
    print(f"✓ Saved image data: {json_path}")
    
    pdf_file.close()
    
    return {
        'markdown_file': md_path,
        'json_file': json_path,
        'total_images': len(processed_images),
        'successful_images': sum(1 for img in processed_images if img['status'] == 'success'),
        'markdown_chars': len(final_markdown)
    }

def parsePDF(path, output_dir=None):
    """Synchronous wrapper for parsePDFAsync"""
    return asyncio.run(parsePDFAsync(path, output_dir))


# Example usage
if __name__ == '__main__':
    result = parsePDF('./backend/uploads/plan_invatamant.pdf')
    print("\n=== Results ===")
    print(f"Markdown file: {result['markdown_file']}")
    print(f"JSON file: {result['json_file']}")
    print(f"Images processed: {result['total_images']} (successful: {result['successful_images']})")
