import difflib
import hashlib
import re
from pathlib import Path
from tempfile import TemporaryDirectory
from dataclasses import dataclass
from typing import List

from unidiff import PatchSet


class SyllabusDiffError(Exception):
    """Raised when syllabus diff processing fails."""


CACHE_VERSION = 'v1'
PARSER_STASH_DIR = Path(__file__).resolve().parent.parent / 'data' / 'stash' / 'parsed'


@dataclass
class DiffRow:
    status: str
    left: str
    right: str

    def to_dict(self):
        return {
            'status': self.status,
            'left': self.left,
            'right': self.right,
            'color': status_to_color(self.status),
        }


def status_to_color(status: str) -> str:
    if status in ('removed', 'modified'):
        return 'red'
    if status == 'added':
        return 'green'
    return 'none'


def _normalize_line(line: str) -> str:
    # Normalize spacing so visually identical lines compare equal.
    return re.sub(r'\s+', ' ', line).strip()


def _looks_like_base64_blob(line: str) -> bool:
    compact = ''.join(line.split()).strip()
    if compact.lower().startswith('data:image') and 'base64,' in compact.lower():
        return True

    if len(compact) < 32:
        return False

    # Base64 tokens are typically composed only of this alphabet and
    # often end with '=' padding.
    if not re.fullmatch(r'[A-Za-z0-9+/=]+', compact):
        return False

    padding = compact.count('=')
    alpha_ratio = sum(ch.isalnum() for ch in compact) / max(1, len(compact))
    return padding > 0 or alpha_ratio > 0.95


def _sanitize_parsed_text(text: str) -> str:
    """
    Keep semantic content and remove parser noise such as placeholders,
    markdown image markers, and accidental base64-like blobs.
    """
    cleaned_lines: List[str] = []
    for raw in text.splitlines():
        line = raw.strip()
        if not line:
            continue

        if line.lower().startswith('### image from page'):
            continue
        if '[No extractable text on this page]' in line:
            continue
        if line.startswith('```'):
            continue
        if _looks_like_base64_blob(line):
            continue

        # Mild markdown cleanup for parser-produced markdown text.
        line = re.sub(r'^#{1,6}\s*', '', line)
        line = line.replace('**', '').replace('__', '').replace('`', '')
        line = _normalize_line(line)
        if line:
            cleaned_lines.append(line)

    return '\n'.join(cleaned_lines)


def _to_lines(text: str) -> List[str]:
    normalized = [_normalize_line(line) for line in text.splitlines()]
    return [line for line in normalized if line]


def _sha256_file(path: str) -> str:
    hasher = hashlib.sha256()
    with open(path, 'rb') as handle:
        for chunk in iter(lambda: handle.read(1024 * 1024), b''):
            hasher.update(chunk)
    return hasher.hexdigest()


def _get_stash_path(path: str, kind: str) -> Path:
    digest = _sha256_file(path)
    PARSER_STASH_DIR.mkdir(parents=True, exist_ok=True)
    return PARSER_STASH_DIR / f'{digest}_{kind}_{CACHE_VERSION}.txt'


def _read_stashed_parsed_text(path: str, kind: str) -> str:
    stash_path = _get_stash_path(path, kind)
    if stash_path.exists():
        cached = stash_path.read_text(encoding='utf-8', errors='ignore').strip()
        if cached:
            return cached
    return ''


def _write_stashed_parsed_text(path: str, kind: str, parsed_text: str) -> None:
    if not parsed_text.strip():
        return

    stash_path = _get_stash_path(path, kind)
    stash_path.write_text(parsed_text, encoding='utf-8')


def _extract_with_existing_pdf_parser(path: str) -> str:
    # Reuse existing project parser for scanned/complex PDFs.
    from parsers.pdfParser import parsePDF

    with TemporaryDirectory(prefix='syllabus_diff_pdf_') as tmp_dir:
        result = parsePDF(path, tmp_dir)
        md_path = result.get('markdown_file')
        if not md_path or not Path(md_path).exists():
            return ''

        content = Path(md_path).read_text(encoding='utf-8', errors='ignore')
        return _sanitize_parsed_text(content)


def _extract_markdown_with_existing_pdf_parser(path: str) -> str:
    from parsers.pdfParser import parsePDF

    with TemporaryDirectory(prefix='syllabus_diff_pdf_md_') as tmp_dir:
        result = parsePDF(path, tmp_dir)
        md_path = result.get('markdown_file')
        if not md_path or not Path(md_path).exists():
            return ''

        return Path(md_path).read_text(encoding='utf-8', errors='ignore').strip()


def _extract_with_existing_docs_parser(path: str) -> str:
    # Reuse existing project parser for DOCX normalization.
    from parsers.docsParser import parseDocs

    with TemporaryDirectory(prefix='syllabus_diff_docx_') as tmp_dir:
        result = parseDocs(path, tmp_dir)
        md_path = result.get('markdown_file')
        if not md_path or not Path(md_path).exists():
            return ''

        content = Path(md_path).read_text(encoding='utf-8', errors='ignore')
        return _sanitize_parsed_text(content)


def _extract_markdown_with_existing_docs_parser(path: str) -> str:
    from parsers.docsParser import parseDocs

    with TemporaryDirectory(prefix='syllabus_diff_docx_md_') as tmp_dir:
        result = parseDocs(path, tmp_dir)
        md_path = result.get('markdown_file')
        if not md_path or not Path(md_path).exists():
            return ''

        return Path(md_path).read_text(encoding='utf-8', errors='ignore').strip()


def extract_text_from_pdf(path: str) -> str:
    cached = _read_stashed_parsed_text(path, 'pdf')
    if cached:
        return cached

    try:
        parsed_text = _extract_with_existing_pdf_parser(path)
        if parsed_text:
            _write_stashed_parsed_text(path, 'pdf', parsed_text)
            return parsed_text
    except Exception as exc:
        raise SyllabusDiffError(f'PDF parsing via parsePDF failed: {exc}') from exc

    raise SyllabusDiffError('PDF parsing via parsePDF produced no usable content.')


def extract_markdown_from_pdf(path: str) -> str:
    cached = _read_stashed_parsed_text(path, 'pdf_md')
    if cached:
        return cached

    try:
        markdown_text = _extract_markdown_with_existing_pdf_parser(path)
        if markdown_text:
            _write_stashed_parsed_text(path, 'pdf_md', markdown_text)
            return markdown_text
    except Exception as exc:
        raise SyllabusDiffError(f'PDF markdown extraction failed: {exc}') from exc

    return extract_text_from_pdf(path)


def extract_text_from_docx(path: str) -> str:
    cached = _read_stashed_parsed_text(path, 'docx')
    if cached:
        return cached

    try:
        parsed_text = _extract_with_existing_docs_parser(path)
        if parsed_text:
            _write_stashed_parsed_text(path, 'docx', parsed_text)
            return parsed_text
    except Exception as exc:
        raise SyllabusDiffError(f'DOCX parsing via parseDocs failed: {exc}') from exc

    raise SyllabusDiffError('DOCX parsing via parseDocs produced no usable content.')


def extract_markdown_from_docx(path: str) -> str:
    cached = _read_stashed_parsed_text(path, 'docx_md')
    if cached:
        return cached

    try:
        markdown_text = _extract_markdown_with_existing_docs_parser(path)
        if markdown_text:
            _write_stashed_parsed_text(path, 'docx_md', markdown_text)
            return markdown_text
    except Exception as exc:
        raise SyllabusDiffError(f'DOCX markdown extraction failed: {exc}') from exc

    return extract_text_from_docx(path)


def extract_text_by_extension(path: str) -> str:
    lower = path.lower()
    if lower.endswith('.pdf'):
        return extract_text_from_pdf(path)
    if lower.endswith('.docx'):
        return extract_text_from_docx(path)
    raise SyllabusDiffError('Only .pdf and .docx are supported for syllabus diff.')


def extract_markdown_by_extension(path: str) -> str:
    lower = path.lower()
    if lower.endswith('.pdf'):
        return extract_markdown_from_pdf(path)
    if lower.endswith('.docx'):
        return extract_markdown_from_docx(path)
    raise SyllabusDiffError('Only .pdf and .docx are supported for markdown extraction.')


def delete_stashed_parsed_content(path: str) -> None:
    digest = _sha256_file(path)
    pattern = f'{digest}_*_{CACHE_VERSION}.txt'
    for candidate in PARSER_STASH_DIR.glob(pattern):
        try:
            candidate.unlink(missing_ok=True)
        except OSError:
            continue


def build_syllabus_diff(old_text: str, new_text: str, include_unchanged: bool = True):
    old_lines = _to_lines(old_text)
    new_lines = _to_lines(new_text)
    matcher = difflib.SequenceMatcher(a=old_lines, b=new_lines)

    rows: List[DiffRow] = []
    summary = {
        'old_lines': len(old_lines),
        'new_lines': len(new_lines),
        'added': 0,
        'removed': 0,
        'modified': 0,
        'unchanged': 0,
    }

    for tag, i1, i2, j1, j2 in matcher.get_opcodes():
        if tag == 'equal':
            count = i2 - i1
            summary['unchanged'] += count
            if include_unchanged:
                for offset in range(count):
                    rows.append(DiffRow('unchanged', old_lines[i1 + offset], new_lines[j1 + offset]))

        elif tag == 'delete':
            for line in old_lines[i1:i2]:
                rows.append(DiffRow('removed', line, ''))
                summary['removed'] += 1

        elif tag == 'insert':
            for line in new_lines[j1:j2]:
                rows.append(DiffRow('added', '', line))
                summary['added'] += 1

        elif tag == 'replace':
            old_chunk = old_lines[i1:i2]
            new_chunk = new_lines[j1:j2]
            pair_count = min(len(old_chunk), len(new_chunk))

            for idx in range(pair_count):
                rows.append(DiffRow('modified', old_chunk[idx], new_chunk[idx]))
                summary['modified'] += 1

            for line in old_chunk[pair_count:]:
                rows.append(DiffRow('removed', line, ''))
                summary['removed'] += 1

            for line in new_chunk[pair_count:]:
                rows.append(DiffRow('added', '', line))
                summary['added'] += 1

    compared = max(1, summary['old_lines'] + summary['new_lines'])
    changed = summary['added'] + summary['removed'] + summary['modified']
    summary['change_ratio'] = round(changed / compared, 4)

    context_lines = 3 if include_unchanged else 0
    unified_lines = list(
        difflib.unified_diff(
            old_lines,
            new_lines,
            fromfile='old',
            tofile='new',
            n=context_lines,
            lineterm='',
        )
    )
    unified_text = '\n'.join(unified_lines)
    patch = PatchSet(unified_text.splitlines(keepends=True))

    hunks = []
    for patched_file in patch:
        for hunk in patched_file:
            lines = []
            for line in hunk:
                if line.is_added:
                    change_type = 'added'
                elif line.is_removed:
                    change_type = 'removed'
                else:
                    change_type = 'context'

                lines.append(
                    {
                        'type': change_type,
                        'old_line': line.source_line_no,
                        'new_line': line.target_line_no,
                        'text': line.value.rstrip('\n'),
                    }
                )

            hunks.append(
                {
                    'old_start': hunk.source_start,
                    'old_length': hunk.source_length,
                    'new_start': hunk.target_start,
                    'new_length': hunk.target_length,
                    'header': f'@@ -{hunk.source_start},{hunk.source_length} +{hunk.target_start},{hunk.target_length} @@',
                    'lines': lines,
                }
            )

    return {
        'summary': summary,
        'rows': [row.to_dict() for row in rows],
        'hunks': hunks,
        'legend': {
            'red': 'Removed from old template or modified compared to new template.',
            'green': 'New fields/lines added in the new template that require completion.',
            'none': 'Unchanged content.',
        },
    }