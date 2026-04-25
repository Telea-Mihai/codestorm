# Codestorm - Multi-Agent Curriculum Processor

## Architecture

A 3-agent pipeline for extracting, validating, and storing curriculum data from PDFs:

### 1. **Extraction Agent** (`extraction_agent.py`)
- Reads PDF files using `pdfplumber`
- Extracts course tables and metadata
- Outputs structured JSON with courses, credits, hours
- Flexible table parsing to handle varying formats

### 2. **Verification Agent** (`verification_agent.py`)
- Validates extracted data integrity
- Checks for missing required fields
- Validates credit/hour values
- Checks consistency across years
- Generates detailed error/warning reports

### 3. **Storage Agent** (`storage_agent.py`)
- Saves extracted data to JSON files
- Stores verification reports
- Manages file listing and retrieval
- Timestamps all saved files

## API Endpoints

### `POST /convert/pdf-to-docx`
Convert an uploaded PDF into a DOCX file.

```bash
curl -X POST -F "file=@input.pdf" http://localhost:5000/convert/pdf-to-docx --output converted.docx
```

### `POST /convert/docx-to-pdf`
Convert an uploaded DOCX into a PDF file.

```bash
curl -X POST -F "file=@input.docx" http://localhost:5000/convert/docx-to-pdf --output converted.pdf
```

### `POST /process-pdf`
Main endpoint that chains all three agents:
```bash
curl -X POST -F "file=@curriculum.pdf" http://localhost:5000/process-pdf
```

**Response:**
```json
{
  "success": true,
  "extracted_courses": 45,
  "is_valid": true,
  "errors": [],
  "warnings": ["Year 1: Unusually high total hours"],
  "storage": {
    "success": true,
    "filepath": "./data/extracted_20240424_120000.json",
    "filename": "extracted_20240424_120000.json"
  }
}
```

### `GET /list-results`
List all stored extraction results:
```bash
curl http://localhost:5000/list-results
```

### `POST /diff/syllabus`
UC 1.3 backend endpoint: compares an old syllabus/template document with a new one
and returns structured side-by-side diff rows.

Comparison mode is parser-first:
- The endpoint first parses documents using the existing project parsers.
- Diff is computed on normalized parsed content, not on raw file internals.
- Base64-like/image-noise lines are filtered out before comparison.
- Extraction is strict parser-only (`parsePDF` and `parseDocs`); no alternate parser path is used.

Accepted formats for both files: `.pdf` and `.docx`.

Color semantics in response:
- `red`: removed from old template or modified compared to new template
- `green`: new lines/fields introduced in the new template
- `none`: unchanged

```bash
curl -X POST http://localhost:5000/diff/syllabus \
  -F "old_file=@FD_2025.docx" \
  -F "new_file=@Template_2026.docx" \
  -F "include_unchanged=false"
```

Response shape:
```json
{
  "success": true,
  "task": "UC 1.3 - The Syllabus Diff",
  "compare_mode": "parsed-content-only",
  "summary": {
    "old_lines": 140,
    "new_lines": 156,
    "added": 22,
    "removed": 8,
    "modified": 14,
    "unchanged": 118,
    "change_ratio": 0.1392
  },
  "legend": {
    "red": "Removed from old template or modified compared to new template.",
    "green": "New fields/lines added in the new template that require completion.",
    "none": "Unchanged content."
  },
  "rows": [
    {"status": "modified", "left": "Objectives", "right": "Expected outcomes", "color": "red"},
    {"status": "added", "left": "", "right": "New competency field", "color": "green"}
  ]
}
```

### `POST /uc3/content-auditor`
UC 3.1 endpoint for detecting overly generic course content, checking bibliography recency,
and validating external link format.

```bash
curl -X POST http://localhost:5000/uc3/content-auditor \
  -F "file=@fisa_disciplina.docx"
```

### `POST /uc3/smart-updater`
UC 3.2 endpoint for bulk review/apply replacements across multiple uploaded documents.
If `apply=true`, updated snapshots are exported in `backend/data/smart_updates_*`.

```bash
curl -X POST http://localhost:5000/uc3/smart-updater \
  -F "files=@FD_1.docx" \
  -F "files=@FD_2.docx" \
  -F 'replacements=[{"find":"Examen 70%","replace":"Examen 60%"}]' \
  -F "apply=true"
```

### `POST /uc3/academic-copilot`
UC 3.3 endpoint for interactive rewrite support based on user instruction.

```bash
curl -X POST http://localhost:5000/uc3/academic-copilot \
  -H "Content-Type: application/json" \
  -d '{
    "current_text": "Capitolul prezinta fundamentele disciplinei.",
    "instruction": "Reformuleaza si include notiuni de AI"
  }'
```

### `POST /uc3/auto-correct-validator`
UC 3.4 endpoint for real-time academic rule checks and corrected weight distribution suggestions.

```bash
curl -X POST http://localhost:5000/uc3/auto-correct-validator \
  -H "Content-Type: application/json" \
  -d '{
    "evaluation_items": [
      {"label": "Examen final", "weight": 80},
      {"label": "Laborator", "weight": 20}
    ]
  }'
```

## Running

```bash
# Install dependencies used by conversion endpoints
pip install flask flask-cors pymupdf python-docx reportlab

# Run Flask app
python app.py

# Test agents (requires a PDF file)
python test_agents.py
```

## Project Structure

```
backend/
├── app.py                    # Flask application with endpoints
├── agents/
│   ├── __init__.py
│   ├── extraction_agent.py   # PDF data extraction
│   ├── verification_agent.py # Data validation
│   └── storage_agent.py      # File persistence
├── test_agents.py            # Test script
├── requirements.txt
├── uploads/                  # Temporary file storage
└── data/                     # Output storage
```

## Next Steps

1. ✅ Basic extraction from tables
2. ✅ Data validation framework
3. ✅ File storage system
4. 🔄 Improve OCR accuracy for handwritten fields
5. 🔄 Add database storage (PostgreSQL/MongoDB)
6. 🔄 Create frontend dashboard to view results
7. 🔄 Add data transformation/normalization
