# RedFlags

> AI-powered agreement analyzer that helps you understand what you're really agreeing to.

RedFlags is a Chrome extension that analyzes Terms & Conditions, Privacy Policies, and Job Contracts to highlight potential risks before you click "I Agree".

---

## Features

- **One-Click Analysis** — Analyze any webpage's terms & conditions instantly
- **PDF Upload** — Upload job contracts and other PDF agreements for analysis
- **Text Paste** — Manually paste agreement text for analysis
- **Risk Assessment** — Get an overall risk score (HIGH / MEDIUM / LOW)
- **Clause Breakdown** — See flagged clauses with explanations and user impact
- **Action Tips** — Practical recommendations for each risky clause
- **Clean UI** — Minimal, professional interface that feels native

---

## Tech Stack

### Backend
- **FastAPI** — Python web framework
- **Groq API** — LLM inference (Llama 3.3 70B)
- **pdfplumber** — PDF text extraction

### Frontend (Chrome Extension)
- **Manifest V3** — Modern Chrome extension architecture
- **Vanilla JS** — No frameworks, minimal dependencies
- **Custom CSS** — Professional, system-native design

---

## Getting Started

### Prerequisites
- Python 3.11+
- Google Chrome
- Groq API key ([get one here](https://console.groq.com/))

### Backend Setup

```bash
cd backend

# Create virtual environment
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Create .env file
echo "GROQ_API_KEY=your_api_key_here" > .env

# Start server
uvicorn main:app --reload --port 8000
```

### Extension Setup

1. Open Chrome and go to `chrome://extensions/`
2. Enable **Developer mode** (top right)
3. Click **Load unpacked**
4. Select the `extension/` folder
5. Pin the RedFlags extension to your toolbar

---

## Usage

### Analyze a Webpage
1. Navigate to any Terms & Conditions or Privacy Policy page
2. Click the RedFlags extension icon
3. Click **"Analyze This Page"**
4. View the risk analysis results

### Analyze a PDF
1. Click the RedFlags extension icon
2. Click **"Upload PDF Agreement"**
3. Select your PDF file (e.g., a job contract)
4. View the risk analysis results

### Paste Text Manually
1. Click the RedFlags extension icon
2. Paste your agreement text into the text area
3. Click **"Analyze Pasted Text"**
4. View the risk analysis results

---

## Project Structure

```
gdg-hackathon/
├── backend/
│   ├── main.py              # FastAPI app entry point
│   ├── routers/
│   │   ├── analyze.py       # Text analysis endpoint
│   │   └── analyze_pdf.py   # PDF analysis endpoint
│   ├── services/
│   │   ├── analyzer.py      # Analysis pipeline
│   │   ├── llm_services.py  # Groq API integration
│   │   ├── scoring.py       # Risk scoring logic
│   │   └── formatter.py     # Response formatting
│   └── schemas/
│       └── schemas.py       # Pydantic models
└── extension/
    ├── manifest.json        # Extension config
    ├── index.html           # Popup UI
    ├── index.js             # Popup logic
    ├── styles.css           # Styling
    └── icons/               # Extension icons
```

---

## API Endpoints

### POST `/analyze/`
Analyze plain text agreement.

**Request:**
```json
{
  "text": "Your agreement text here..."
}
```

### POST `/analyze-pdf/`
Analyze PDF document.

**Request:** `multipart/form-data` with `file` field containing PDF

**Response (both endpoints):**
```json
{
  "overall_risk": "HIGH",
  "risk_score": 75,
  "confidence_score": "85%",
  "what_you_give_up": ["Control over your data", "..."],
  "risk_patterns": ["Broad data sharing", "..."],
  "summary": ["..."],
  "flags": [
    {
      "category": "Data Usage",
      "risk_level": "HIGH",
      "explanation": "...",
      "user_impact": "...",
      "simple_explanation": "...",
      "example_scenario": "...",
      "action_tip": "...",
      "tags": ["Data", "Privacy"]
    }
  ]
}
```

---

## Disclaimer

RedFlags provides educational insights about potential risks in agreements. It is **not legal advice** and does not replace professional legal consultation. The risk assessments reflect potential impact if terms are enforced as written — not judgments of legality or fairness.

---

## Hackathon

Built for the **Google Developer Group Hackathon 2026**.

Made with ❤️ by [Rounakk](https://github.com/rounakkraaj-1744) and [Shivam](https://github.com/shivam4511)
