import os
import hashlib
import mimetypes
import re
from datetime import datetime
from pathlib import Path

from flask import Flask, jsonify, request, send_file
from flask_cors import CORS
from werkzeug.utils import secure_filename

from parsers.converter import ConversionError, convert_docx_to_pdf, convert_pdf_to_docx
from parsers.syllabus_diff import (
    SyllabusDiffError,
    build_syllabus_diff,
    delete_stashed_parsed_content,
    extract_markdown_by_extension,
    extract_text_by_extension,
)
from uc3_usecases import (
    UC3Error,
    parse_replacements_payload,
    run_academic_copilot,
    run_auto_correct_validator,
    run_content_auditor,
    run_smart_updater,
)
from uc1_integrity_guard import verifica_integritate_document
from uc2_1_sync_master import ruleaza_sync_master
from uc2_2_competency_mapper import mapper_competente_cross_document
from uc2_math_checker import build_math_alerts, verifica_consistenta_matematica
from uc4_competency_injector import extrage_date_plan, genereaza_draft_word

try:
    from dotenv import load_dotenv

    load_dotenv(os.path.join(os.path.dirname(os.path.abspath(__file__)), ".env"))
except ImportError:
    pass

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
UPLOAD_DIR = os.path.join(SCRIPT_DIR, 'uploads')
DATA_DIR = os.path.join(SCRIPT_DIR, 'data')

app = Flask(__name__)
CORS(app)
app.config['UPLOAD_FOLDER'] = UPLOAD_DIR

os.makedirs(UPLOAD_DIR, exist_ok=True)
os.makedirs(DATA_DIR, exist_ok=True)

# Default Word template for UC4 (ship with repo under backend/).
DEFAULT_UC4_TEMPLATE = os.path.join(SCRIPT_DIR, "template_gol.docx")

_API_ROUTES = [
    "/",
    "/upload",
    "/documents",
    "/documents/<hash>/file",
    "/documents/<hash>/content",
    "/documents/<hash>/markdown",
    "/documents/<hash>",
    "/convert/pdf-to-docx",
    "/convert/docx-to-pdf",
    "/diff/syllabus",
    "/uc1/integrity-guard",
    "/uc1/math-consistency",
    "/uc2/sync-master",
    "/uc2/competency-mapper",
    "/uc3/content-auditor",
    "/uc3/smart-updater",
    "/uc3/academic-copilot",
    "/uc3/auto-correct-validator",
    "/uc4/bootstrap-draft",
]

MARKDOWN_DIR = os.path.join(DATA_DIR, 'markdown')
os.makedirs(MARKDOWN_DIR, exist_ok=True)


def _is_valid_hash(candidate: str) -> bool:
    return bool(re.fullmatch(r'[a-f0-9]{64}', candidate.strip().lower()))


def _find_uploaded_paths_for_hash(doc_hash: str) -> list[str]:
    if not _is_valid_hash(doc_hash):
        return []

    matches = []
    for entry in os.listdir(UPLOAD_DIR):
        full = os.path.join(UPLOAD_DIR, entry)
        if not os.path.isfile(full):
            continue
        stem, _ = os.path.splitext(entry)
        if stem == doc_hash:
            matches.append(full)

    matches.sort(key=lambda item: os.path.getmtime(item), reverse=True)
    return matches


def _markdown_path_for_hash(doc_hash: str) -> str:
    return os.path.join(MARKDOWN_DIR, f'{doc_hash}.md')


def _collect_documents() -> list[dict]:
    docs = []
    for entry in os.listdir(UPLOAD_DIR):
        full = os.path.join(UPLOAD_DIR, entry)
        if not os.path.isfile(full):
            continue

        hash_part, ext = os.path.splitext(entry)
        if not _is_valid_hash(hash_part):
            continue

        stat = os.stat(full)
        docs.append(
            {
                'hash': hash_part,
                'server_path': full,
                'name': entry,
                'extension': ext.lower(),
                'size': stat.st_size,
                'uploaded_at': int(stat.st_mtime * 1000),
                'has_markdown_draft': os.path.exists(_markdown_path_for_hash(hash_part)),
            }
        )

    docs.sort(key=lambda d: d['uploaded_at'], reverse=True)
    return docs


def _http_for_value_error(exc: ValueError) -> tuple | None:
    """Map configuration errors to 503 so clients can tell missing API key from bad input."""
    message = str(exc)
    if 'GEMINI_API_KEY' in message:
        return jsonify({'success': False, 'error': message}), 503
    return None


def _save_uploaded_file(file_storage):
    if not file_storage or not file_storage.filename:
        raise ValueError('No selected file')

    safe_name = secure_filename(file_storage.filename)
    if not safe_name:
        raise ValueError('Invalid filename')

    file_storage.stream.seek(0)
    file_bytes = file_storage.read()
    file_storage.stream.seek(0)

    if not file_bytes:
        raise ValueError('Uploaded file is empty')

    digest = hashlib.sha256(file_bytes).hexdigest()
    ext = os.path.splitext(safe_name)[1].lower()
    final_name = f'{digest}{ext}'
    source_path = os.path.join(UPLOAD_DIR, final_name)

    # Reuse stashed file if the same content was already uploaded.
    if not os.path.exists(source_path):
        with open(source_path, 'wb') as handle:
            handle.write(file_bytes)

    return source_path


def _extract_text_for_any_file(file_storage):
    source_path = _save_uploaded_file(file_storage)
    lower_name = source_path.lower()

    if lower_name.endswith('.pdf') or lower_name.endswith('.docx'):
        text = extract_text_by_extension(source_path)
        return source_path, text

    try:
        with open(source_path, 'r', encoding='utf-8', errors='ignore') as handle:
            return source_path, handle.read()
    except Exception as exc:
        raise ValueError(f'Unsupported file or unreadable text content: {exc}') from exc


@app.route('/')
def ping():
    return jsonify(
        {
            'status': 'ok',
            'service': 'codestorm-backend',
            'routes': _API_ROUTES,
        }
    )


@app.route('/upload', methods=['POST'])
def upload():
    if 'file' not in request.files:
        return jsonify({'success': False, 'error': 'No file part'}), 400

    file = request.files['file']
    try:
        source_path = _save_uploaded_file(file)

        parse_cached = False
        parse_warning = None
        if source_path.lower().endswith('.pdf') or source_path.lower().endswith('.docx'):
            try:
                # Pre-warm parsed cache so downstream tools can reuse extracted content.
                extract_text_by_extension(source_path)
                parse_cached = True
            except Exception as exc:
                parse_warning = f'File uploaded, but parsed cache prewarm failed: {exc}'
    except ValueError as exc:
        return jsonify({'success': False, 'error': str(exc)}), 400
    except Exception as exc:
        return jsonify({'success': False, 'error': f'Error saving file: {exc}'}), 500

    payload = {
        'success': True,
        'filepath': source_path,
    }
    if source_path.lower().endswith('.pdf') or source_path.lower().endswith('.docx'):
        payload['parsed_cache_ready'] = parse_cached
        if parse_warning:
            payload['warning'] = parse_warning

    return jsonify(payload)


@app.route('/documents', methods=['GET'])
def list_documents():
    return jsonify({'success': True, 'documents': _collect_documents()})


@app.route('/documents/<doc_hash>/file', methods=['GET'])
def get_document_file(doc_hash: str):
    paths = _find_uploaded_paths_for_hash(doc_hash)
    if not paths:
        return jsonify({'success': False, 'error': 'Document not found.'}), 404

    file_path = paths[0]
    guessed_mime = mimetypes.guess_type(file_path)[0] or 'application/octet-stream'
    return send_file(
        file_path,
        as_attachment=False,
        download_name=os.path.basename(file_path),
        mimetype=guessed_mime,
    )


@app.route('/documents/<doc_hash>/content', methods=['GET'])
def get_document_content(doc_hash: str):
    paths = _find_uploaded_paths_for_hash(doc_hash)
    if not paths:
        return jsonify({'success': False, 'error': 'Document not found.'}), 404

    file_path = paths[0]
    markdown_path = _markdown_path_for_hash(doc_hash)
    ext = os.path.splitext(file_path)[1].lower()

    try:
        if os.path.exists(markdown_path):
            markdown = Path(markdown_path).read_text(encoding='utf-8', errors='ignore')
        elif ext in ('.pdf', '.docx'):
            markdown = extract_markdown_by_extension(file_path)
        else:
            markdown = Path(file_path).read_text(encoding='utf-8', errors='ignore')

        if ext in ('.pdf', '.docx'):
            parsed_text = extract_text_by_extension(file_path)
        else:
            parsed_text = markdown
    except (ValueError, SyllabusDiffError) as exc:
        return jsonify({'success': False, 'error': str(exc)}), 422
    except Exception as exc:
        return jsonify({'success': False, 'error': f'Could not load document content: {exc}'}), 500

    return jsonify(
        {
            'success': True,
            'document': {
                'hash': doc_hash,
                'server_path': file_path,
                'filename': os.path.basename(file_path),
                'extension': ext,
                'is_pdf': ext == '.pdf',
                'is_docx': ext == '.docx',
                'viewer_url': f'/documents/{doc_hash}/file',
            },
            'markdown': markdown,
            'parsed_text': parsed_text,
        }
    )


@app.route('/documents/<doc_hash>/markdown', methods=['PUT'])
def update_document_markdown(doc_hash: str):
    paths = _find_uploaded_paths_for_hash(doc_hash)
    if not paths:
        return jsonify({'success': False, 'error': 'Document not found.'}), 404

    payload = request.get_json(silent=True) or {}
    markdown = payload.get('markdown')
    if not isinstance(markdown, str):
        return jsonify({'success': False, 'error': 'markdown must be a string.'}), 400

    target_path = _markdown_path_for_hash(doc_hash)
    try:
        Path(target_path).write_text(markdown, encoding='utf-8')
    except Exception as exc:
        return jsonify({'success': False, 'error': f'Failed to save markdown: {exc}'}), 500

    return jsonify({'success': True, 'hash': doc_hash, 'markdown_path': target_path})


@app.route('/documents/<doc_hash>', methods=['DELETE'])
def delete_document(doc_hash: str):
    paths = _find_uploaded_paths_for_hash(doc_hash)
    if not paths:
        return jsonify({'success': False, 'error': 'Document not found.'}), 404

    deleted_files = []
    for file_path in paths:
        try:
            if file_path.lower().endswith('.pdf') or file_path.lower().endswith('.docx'):
                delete_stashed_parsed_content(file_path)
            os.remove(file_path)
            deleted_files.append(file_path)
        except FileNotFoundError:
            continue
        except Exception as exc:
            return jsonify({'success': False, 'error': f'Failed deleting {file_path}: {exc}'}), 500

    markdown_path = _markdown_path_for_hash(doc_hash)
    try:
        if os.path.exists(markdown_path):
            os.remove(markdown_path)
    except Exception as exc:
        return jsonify({'success': False, 'error': f'Failed deleting markdown draft: {exc}'}), 500

    return jsonify({'success': True, 'hash': doc_hash, 'deleted_files': deleted_files})


@app.route('/convert/pdf-to-docx', methods=['POST'])
def convert_pdf_to_docx_route():
    if 'file' not in request.files:
        return jsonify({'success': False, 'error': 'No file part'}), 400

    file = request.files['file']
    if not file.filename.lower().endswith('.pdf'):
        return jsonify({'success': False, 'error': 'Expected a .pdf file'}), 400

    try:
        source_path = _save_uploaded_file(file)
        output_path = convert_pdf_to_docx(source_path, DATA_DIR)
    except ValueError as exc:
        return jsonify({'success': False, 'error': str(exc)}), 400
    except ConversionError as exc:
        return jsonify({'success': False, 'error': str(exc)}), 422
    except Exception as exc:
        return jsonify({'success': False, 'error': f'Conversion failed: {exc}'}), 500

    return send_file(
        output_path,
        as_attachment=True,
        download_name=os.path.basename(output_path),
        mimetype='application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    )


@app.route('/convert/docx-to-pdf', methods=['POST'])
def convert_docx_to_pdf_route():
    if 'file' not in request.files:
        return jsonify({'success': False, 'error': 'No file part'}), 400

    file = request.files['file']
    if not file.filename.lower().endswith('.docx'):
        return jsonify({'success': False, 'error': 'Expected a .docx file'}), 400

    try:
        source_path = _save_uploaded_file(file)
        output_path = convert_docx_to_pdf(source_path, DATA_DIR)
    except ValueError as exc:
        return jsonify({'success': False, 'error': str(exc)}), 400
    except ConversionError as exc:
        return jsonify({'success': False, 'error': str(exc)}), 422
    except Exception as exc:
        return jsonify({'success': False, 'error': f'Conversion failed: {exc}'}), 500

    return send_file(
        output_path,
        as_attachment=True,
        download_name=os.path.basename(output_path),
        mimetype='application/pdf',
    )


@app.route('/process-file', methods=['POST'])
def process_file():
    return jsonify(
        {
            'success': False,
            'error': 'Not implemented yet. Use /convert/pdf-to-docx or /convert/docx-to-pdf.',
        }
    ), 501


@app.route('/uc1/integrity-guard', methods=['POST'])
def uc1_integrity_guard_route():
    """
    UC 1.1 — Visual integrity check (missing sections / empty placeholders) via Gemini.
    """
    file = request.files.get('file')
    if file is None:
        return jsonify({'success': False, 'error': 'file is required (multipart field name: file).'}), 400

    try:
        source_path = _save_uploaded_file(file)
        report = verifica_integritate_document(source_path)
    except ValueError as exc:
        mapped = _http_for_value_error(exc)
        if mapped:
            return mapped
        return jsonify({'success': False, 'error': str(exc)}), 400
    except Exception as exc:
        return jsonify({'success': False, 'error': f'UC 1.1 failed: {exc}'}), 500

    return jsonify(
        {
            'success': True,
            'task': 'UC 1.1 - Integrity Guard',
            'input': {'filename': os.path.basename(source_path)},
            'result': report.model_dump(),
        }
    )


@app.route('/uc1/math-consistency', methods=['POST'])
def uc1_math_consistency_route():
    """
    UC 1.2 — Extract hours and evaluation weights; apply deterministic alert rules.
    """
    file = request.files.get('file')
    if file is None:
        return jsonify({'success': False, 'error': 'file is required (multipart field name: file).'}), 400

    try:
        source_path = _save_uploaded_file(file)
        report = verifica_consistenta_matematica(source_path)
        alerts = build_math_alerts(report)
    except ValueError as exc:
        mapped = _http_for_value_error(exc)
        if mapped:
            return mapped
        return jsonify({'success': False, 'error': str(exc)}), 400
    except Exception as exc:
        return jsonify({'success': False, 'error': f'UC 1.2 failed: {exc}'}), 500

    return jsonify(
        {
            'success': True,
            'task': 'UC 1.2 - Math consistency',
            'input': {'filename': os.path.basename(source_path)},
            'result': report.model_dump(),
            'alerts': alerts,
        }
    )


@app.route('/uc2/sync-master', methods=['POST'])
def uc2_sync_master_route():
    """
    UC 2.1 — Compare course sheet vs curriculum plan (credits, evaluation type, title).
    """
    fisa = request.files.get('fisa') or request.files.get('file_fisa')
    plan = request.files.get('plan') or request.files.get('file_plan')
    if fisa is None or plan is None:
        return (
            jsonify(
                {
                    'success': False,
                    'error': 'Both fisa and plan files are required (multipart: fisa, plan).',
                }
            ),
            400,
        )

    try:
        fisa_path = _save_uploaded_file(fisa)
        plan_path = _save_uploaded_file(plan)
        report = ruleaza_sync_master(fisa_path, plan_path)
    except ValueError as exc:
        mapped = _http_for_value_error(exc)
        if mapped:
            return mapped
        return jsonify({'success': False, 'error': str(exc)}), 400
    except Exception as exc:
        return jsonify({'success': False, 'error': f'UC 2.1 failed: {exc}'}), 500

    return jsonify(
        {
            'success': True,
            'task': 'UC 2.1 - Sync Master',
            'input': {
                'fisa': os.path.basename(fisa_path),
                'plan': os.path.basename(plan_path),
            },
            'result': report.model_dump(),
        }
    )


@app.route('/uc2/competency-mapper', methods=['POST'])
def uc2_competency_mapper_route():
    """
    UC 2.2 — Cross-check professional / transversal competencies vs the official plan.
    """
    fisa = request.files.get('fisa') or request.files.get('file_fisa')
    plan = request.files.get('plan') or request.files.get('file_plan')
    if fisa is None or plan is None:
        return (
            jsonify(
                {
                    'success': False,
                    'error': 'Both fisa and plan files are required (multipart: fisa, plan).',
                }
            ),
            400,
        )

    try:
        fisa_path = _save_uploaded_file(fisa)
        plan_path = _save_uploaded_file(plan)
        report = mapper_competente_cross_document(fisa_path, plan_path)
    except ValueError as exc:
        mapped = _http_for_value_error(exc)
        if mapped:
            return mapped
        return jsonify({'success': False, 'error': str(exc)}), 400
    except Exception as exc:
        return jsonify({'success': False, 'error': f'UC 2.2 failed: {exc}'}), 500

    return jsonify(
        {
            'success': True,
            'task': 'UC 2.2 - Competency mapper',
            'input': {
                'fisa': os.path.basename(fisa_path),
                'plan': os.path.basename(plan_path),
            },
            'result': report.model_dump(),
        }
    )


@app.route('/uc4/bootstrap-draft', methods=['POST'])
def uc4_bootstrap_draft_route():
    """
    UC 4 — Read a subject row from the curriculum plan PDF and fill template_gol.docx.
    Form fields: plan (file), subject (text). Optional: template (docx file).
    """
    plan = request.files.get('plan')
    subject = (request.form.get('subject') or '').strip()
    if plan is None:
        return jsonify({'success': False, 'error': 'plan file is required (multipart field: plan).'}), 400
    if not subject:
        return jsonify({'success': False, 'error': 'subject is required (form field: subject).'}), 400

    template_upload = request.files.get('template')
    template_path = DEFAULT_UC4_TEMPLATE
    if template_upload and template_upload.filename:
        try:
            template_path = _save_uploaded_file(template_upload)
        except ValueError as exc:
            return jsonify({'success': False, 'error': str(exc)}), 400

    if not os.path.isfile(template_path):
        return (
            jsonify(
                {
                    'success': False,
                    'error': f'Template not found at {template_path}. Add template_gol.docx or upload template.',
                }
            ),
            500,
        )

    stamp = datetime.now().strftime('%Y%m%d_%H%M%S')
    output_path = os.path.join(DATA_DIR, f'bootstrap_draft_{stamp}.docx')

    try:
        plan_path = _save_uploaded_file(plan)
        payload = extrage_date_plan(plan_path, subject)
        genereaza_draft_word(payload, template_path, output_path)
    except ValueError as exc:
        mapped = _http_for_value_error(exc)
        if mapped:
            return mapped
        return jsonify({'success': False, 'error': str(exc)}), 400
    except Exception as exc:
        return jsonify({'success': False, 'error': f'UC 4 failed: {exc}'}), 500

    return send_file(
        output_path,
        as_attachment=True,
        download_name=os.path.basename(output_path),
        mimetype='application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    )


@app.route('/diff/syllabus', methods=['POST'])
def syllabus_diff_route():
    old_file = request.files.get('old_file')
    new_file = request.files.get('new_file')

    if old_file is None or new_file is None:
        return (
            jsonify(
                {
                    'success': False,
                    'error': 'Both old_file and new_file must be provided.',
                }
            ),
            400,
        )

    old_name = old_file.filename.lower() if old_file.filename else ''
    new_name = new_file.filename.lower() if new_file.filename else ''

    if not (old_name.endswith('.pdf') or old_name.endswith('.docx')):
        return jsonify({'success': False, 'error': 'old_file must be .pdf or .docx.'}), 400
    if not (new_name.endswith('.pdf') or new_name.endswith('.docx')):
        return jsonify({'success': False, 'error': 'new_file must be .pdf or .docx.'}), 400

    include_unchanged = request.form.get('include_unchanged', 'true').strip().lower() != 'false'

    try:
        old_path = _save_uploaded_file(old_file)
        new_path = _save_uploaded_file(new_file)
        old_text = extract_text_by_extension(old_path)
        new_text = extract_text_by_extension(new_path)
        result = build_syllabus_diff(
            old_text=old_text,
            new_text=new_text,
            include_unchanged=include_unchanged,
        )
    except ValueError as exc:
        return jsonify({'success': False, 'error': str(exc)}), 400
    except SyllabusDiffError as exc:
        return jsonify({'success': False, 'error': str(exc)}), 422
    except Exception as exc:
        return jsonify({'success': False, 'error': f'Syllabus diff failed: {exc}'}), 500

    return jsonify(
        {
            'success': True,
            'task': 'UC 1.3 - The Syllabus Diff',
            'compare_mode': 'parsed-content-only',
            'summary': result['summary'],
            'legend': result['legend'],
            'rows': result['rows'],
            'input': {
                'old_filename': os.path.basename(old_path),
                'new_filename': os.path.basename(new_path),
                'include_unchanged': include_unchanged,
            },
        }
    )


@app.route('/uc3/content-auditor', methods=['POST'])
def uc3_content_auditor_route():
    file = request.files.get('file')
    if file is None:
        return jsonify({'success': False, 'error': 'file is required.'}), 400

    try:
        source_path, text = _extract_text_for_any_file(file)
        result = run_content_auditor(text)
    except ValueError as exc:
        return jsonify({'success': False, 'error': str(exc)}), 400
    except UC3Error as exc:
        return jsonify({'success': False, 'error': str(exc)}), 422
    except SyllabusDiffError as exc:
        return jsonify({'success': False, 'error': str(exc)}), 422
    except Exception as exc:
        return jsonify({'success': False, 'error': f'UC 3.1 failed: {exc}'}), 500

    return jsonify(
        {
            'success': True,
            'task': 'UC 3.1 - The Content Auditor',
            'input': {
                'filename': os.path.basename(source_path),
            },
            'result': result,
        }
    )


@app.route('/uc3/smart-updater', methods=['POST'])
def uc3_smart_updater_route():
    files = request.files.getlist('files')
    replacements_raw = request.form.get('replacements', '[]')
    apply_changes = request.form.get('apply', 'false').strip().lower() == 'true'

    if not files:
        return jsonify({'success': False, 'error': 'At least one file must be uploaded as files.'}), 400

    try:
        replacements = parse_replacements_payload(replacements_raw)
        documents = []
        for file in files:
            source_path, text = _extract_text_for_any_file(file)
            documents.append(
                {
                    'name': os.path.basename(source_path),
                    'content': text,
                }
            )

        result = run_smart_updater(
            documents=documents,
            replacements=replacements,
            apply_changes=apply_changes,
            output_dir=DATA_DIR,
        )
    except ValueError as exc:
        return jsonify({'success': False, 'error': str(exc)}), 400
    except UC3Error as exc:
        return jsonify({'success': False, 'error': str(exc)}), 422
    except SyllabusDiffError as exc:
        return jsonify({'success': False, 'error': str(exc)}), 422
    except Exception as exc:
        return jsonify({'success': False, 'error': f'UC 3.2 failed: {exc}'}), 500

    return jsonify(
        {
            'success': True,
            'task': 'UC 3.2 - The Smart Updater',
            'result': result,
        }
    )


@app.route('/uc3/academic-copilot', methods=['POST'])
def uc3_academic_copilot_route():
    payload = request.get_json(silent=True) or {}
    current_text = str(payload.get('current_text', ''))
    instruction = str(payload.get('instruction', ''))

    try:
        result = run_academic_copilot(current_text=current_text, instruction=instruction)
    except UC3Error as exc:
        return jsonify({'success': False, 'error': str(exc)}), 422
    except Exception as exc:
        return jsonify({'success': False, 'error': f'UC 3.3 failed: {exc}'}), 500

    return jsonify(
        {
            'success': True,
            'task': 'UC 3.3 - The Academic Copilot',
            'result': result,
        }
    )


@app.route('/uc3/auto-correct-validator', methods=['POST'])
def uc3_auto_correct_validator_route():
    payload = request.get_json(silent=True) or {}
    items = payload.get('evaluation_items', [])

    try:
        if not isinstance(items, list):
            raise UC3Error('evaluation_items must be an array.')
        result = run_auto_correct_validator(items)
    except UC3Error as exc:
        return jsonify({'success': False, 'error': str(exc)}), 422
    except Exception as exc:
        return jsonify({'success': False, 'error': f'UC 3.4 failed: {exc}'}), 500

    return jsonify(
        {
            'success': True,
            'task': 'UC 3.4 - The Auto-Corrector & Validator',
            'result': result,
        }
    )


if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0', port=5000)
