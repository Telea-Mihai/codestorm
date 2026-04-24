import os
from werkzeug.utils import secure_filename
from flask import *
from flask_cors import CORS
from agents.extraction_agent import ExtractionAgent
from agents.verification_agent import VerificationAgent
from agents.storage_agent import StorageAgent

# Get the directory where this script lives
SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
UPLOAD_DIR = os.path.join(SCRIPT_DIR, 'uploads')
DATA_DIR = os.path.join(SCRIPT_DIR, 'data')

app = Flask(__name__)
CORS(app)  # Enable CORS for all routes
app.config['UPLOAD_FOLDER'] = UPLOAD_DIR

# Create upload and data directories if they don't exist
os.makedirs(UPLOAD_DIR, exist_ok=True)
os.makedirs(DATA_DIR, exist_ok=True)

# Initialize agents
extraction_agent = ExtractionAgent()
verification_agent = VerificationAgent()
storage_agent = StorageAgent(DATA_DIR)

@app.route('/')
def ping():
    return 'pong'

@app.route('/upload', methods=['POST'])
def upload():
    if 'file' not in request.files:
        return 'No file part', 400
    file = request.files['file']
    if file.filename == '':
        return 'No selected file', 400
    
    if file:
        try:
            filename = secure_filename(file.filename)
            file.save(os.path.join(UPLOAD_DIR, filename))
        except Exception as e:
            print(f'Error saving file: {str(e)}')
            return f'Error saving file: {str(e)}', 500
    return 'File received', 200

@app.route('/process-file', methods=['POST'])
def process_file():
    
if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0')