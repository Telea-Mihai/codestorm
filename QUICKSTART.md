# Codestorm Hackathon - Quick Start Guide

## ✅ What's Been Built (1 hour invested)

You now have a fully functional **3-agent pipeline** for curriculum data processing:

### Backend (Flask + 3 Agents)
- **Extraction Agent**: Reads PDF tables → extracts courses, credits, hours
- **Verification Agent**: Validates data integrity → reports errors & warnings
- **Storage Agent**: Persists results to JSON files with timestamps

### Frontend (Next.js)
- Clean upload interface with drag-and-drop
- Real-time feedback on processing status
- Shows extracted course count, validation status, errors/warnings
- Displays storage metadata

## 🚀 How to Run (Both Terminals)

### Terminal 1: Backend (Flask)
```bash
cd c:\Users\Mihai\Documents\codestorm\backend
python app.py
# Server runs on http://localhost:5000
```

### Terminal 2: Frontend (Next.js)
```bash
cd c:\Users\Mihai\Documents\codestorm\webapp
npm run dev
# App runs on http://localhost:3000
```

## 📝 API Reference

### Process PDF (Main Endpoint)
```bash
POST http://localhost:5000/process-pdf
Content-Type: multipart/form-data

# Response:
{
  "success": true,
  "extracted_courses": 45,
  "is_valid": true,
  "errors": [],
  "warnings": [],
  "storage": {
    "success": true,
    "filepath": "./data/extracted_20240424_120000.json",
    "filename": "extracted_20240424_120000.json"
  }
}
```

### List Results
```bash
GET http://localhost:5000/list-results
# Returns array of all stored JSON files
```

## 📂 Project Structure

```
codestorm/
├── backend/
│   ├── app.py                      # Main Flask app
│   ├── agents/
│   │   ├── extraction_agent.py     # PDF extraction
│   │   ├── verification_agent.py   # Data validation
│   │   └── storage_agent.py        # File storage
│   ├── test_agents.py              # Test script
│   ├── uploads/                    # Temp uploads
│   └── data/                       # Extracted results
│
└── webapp/
    ├── src/app/
    │   ├── page.tsx                # Main page
    │   └── components/
    │       └── PDFUploader.tsx      # Upload component
    └── package.json
```

## 🧪 Test It

1. **Run Backend**
   ```bash
   cd backend && python app.py
   ```

2. **Run Frontend** (new terminal)
   ```bash
   cd webapp && npm run dev
   ```

3. **Open Browser**
   - Go to http://localhost:3000
   - Click "Upload PDF" or drag a PDF
   - Watch the 3-agent pipeline process it
   - See results in real-time

## ⏭️ Next Steps (If Time Allows)

### High Priority
- [ ] Improve PDF table detection (handle merged cells, multi-page tables)
- [ ] Better OCR for handwritten fields
- [ ] Add database storage (currently JSON only)
- [ ] Error handling for malformed PDFs

### Medium Priority
- [ ] Batch processing endpoint
- [ ] Export results as CSV/Excel
- [ ] Dashboard to view all processed files
- [ ] Data quality metrics

### Nice-to-Have
- [ ] Implement plagiarism check across curriculums
- [ ] Course comparison/similarity analysis
- [ ] Schedule optimization based on course dependencies

## 💡 Architecture Notes

- **Simple & Fast**: No external queues or complex orchestration
- **Modular**: Easy to swap out agents or add new ones
- **Testable**: Each agent is independent and tested
- **Hackathon-Ready**: Minimal dependencies, quick to modify

## 🐛 Troubleshooting

**CORS Error?**
The Flask app allows all origins by default. If issues, use a proxy or add Flask-CORS.

**PDF not extracting?**
Check if PDF has tables (pdfplumber works best with structured tables). PDFs with only images need OCR setup.

**Port already in use?**
Change Flask port: `app.run(port=5001)`
Change Next.js port: `npm run dev -- -p 3001`

---

**Time spent**: ~45 minutes
**Lines of code**: ~500 (including agents + API)
**Agent pipeline**: 3 (Extract → Verify → Store)

Good luck with the hackathon! 🎉
