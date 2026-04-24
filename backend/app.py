import os
import hashlib

from flask import Flask, jsonify, request, send_file
from flask_cors import CORS
from werkzeug.utils import secure_filename

from parsers.converter import ConversionError, convert_docx_to_pdf, convert_pdf_to_docx
from parsers.syllabus_diff import (
    SyllabusDiffError,
    build_syllabus_diff,
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

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
UPLOAD_DIR = os.path.join(SCRIPT_DIR, 'uploads')
DATA_DIR = os.path.join(SCRIPT_DIR, 'data')

app = Flask(__name__)
CORS(app)
app.config['UPLOAD_FOLDER'] = UPLOAD_DIR

os.makedirs(UPLOAD_DIR, exist_ok=True)
os.makedirs(DATA_DIR, exist_ok=True)


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
    return jsonify({'status': 'ok', 'service': 'codestorm-backend'})


@app.route('/upload', methods=['POST'])
def upload():
    if 'file' not in request.files:
        return jsonify({'success': False, 'error': 'No file part'}), 400

    file = request.files['file']
    try:
        source_path = _save_uploaded_file(file)
    except ValueError as exc:
        return jsonify({'success': False, 'error': str(exc)}), 400
    except Exception as exc:
        return jsonify({'success': False, 'error': f'Error saving file: {exc}'}), 500

    return jsonify({'success': True, 'filepath': source_path})


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
