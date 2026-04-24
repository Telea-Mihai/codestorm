import os
from datetime import datetime

from flask import Flask, jsonify, request, send_file
from flask_cors import CORS
from werkzeug.utils import secure_filename

from parsers.converter import ConversionError, convert_docx_to_pdf, convert_pdf_to_docx

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

    timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
    final_name = f'{timestamp}_{safe_name}'
    source_path = os.path.join(UPLOAD_DIR, final_name)
    file_storage.save(source_path)
    return source_path


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


if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0', port=5000)
