# Python Integration Guide for Infradyn

## Overview
This guide identifies components suitable for Python migration and outlines the integration architecture.

---

## 🎯 Components Recommended for Python

### 1. AI Extraction Engine ⭐ **HIGHEST PRIORITY**
**Current:** `src/lib/services/ai-extraction.ts` (783 lines)

| Feature | Python Advantage |
|---------|-----------------|
| OCR (AWS Textract) | `boto3` native SDK, better async handling |
| GPT Parsing | `langchain`, `openai` with streaming |
| Document parsing | `pdfplumber`, `python-docx`, `openpyxl` |
| Image preprocessing | `Pillow`, `opencv-python` |

**Python Libraries:**
```python
# requirements.txt
boto3>=1.34.0           # AWS Textract
openai>=1.12.0          # GPT-4 parsing
pdfplumber>=0.10.0      # PDF extraction
python-docx>=1.1.0      # Word documents
openpyxl>=3.1.0         # Excel files
langchain>=0.1.0        # LLM orchestration
```

---

### 2. KPI Engine ⭐ **HIGH PRIORITY**
**Current:** `src/lib/services/kpi-engine.ts` (693 lines)

| Calculation | Python Advantage |
|-------------|-----------------|
| S-Curve analysis | `numpy`, `scipy` for curves |
| Financial aggregations | `pandas` DataFrames |
| Statistical calculations | Native `statistics` module |
| Time-series forecasting | `prophet`, `statsmodels` |

**Python Libraries:**
```python
pandas>=2.2.0           # Data manipulation
numpy>=1.26.0           # Numerical computing
scipy>=1.12.0           # S-curve fitting
prophet>=1.1.0          # Forecasting (optional)
```

---

### 3. Confidence Engine ⭐ **MEDIUM PRIORITY**
**Current:** `src/lib/services/confidence-engine.ts` (276 lines)

| Feature | Python Advantage |
|---------|-----------------|
| Pattern matching | `regex` module (more powerful) |
| Statistical scoring | `sklearn` for ML confidence |
| Text quality analysis | `textstat`, `nltk` |

**Python Libraries:**
```python
scikit-learn>=1.4.0     # ML-based confidence
nltk>=3.8.0             # Text analysis
textstat>=0.7.0         # Readability metrics
regex>=2023.0.0         # Advanced regex
```

---

### 4. Report Engine ⭐ **MEDIUM PRIORITY**
**Current:** `src/lib/services/report-engine.ts` (555 lines)

| Feature | Python Advantage |
|---------|-----------------|
| Risk scoring models | `sklearn` classifiers |
| Cashflow forecasting | `pandas` time-series |
| PDF generation | `reportlab`, `weasyprint` |
| Excel exports | `openpyxl`, `xlsxwriter` |

---

### 5. Email Processor ⭐ **LOW PRIORITY**
**Current:** `src/lib/services/email-processor.ts` (17KB)

Python libraries: `imap-tools`, `email-validator`, `beautifulsoup4`

---

## 🏗️ Integration Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Next.js Frontend                          │
│                  (React Components)                          │
└─────────────────────┬───────────────────────────────────────┘
                      │ API Routes / Server Actions
                      ▼
┌─────────────────────────────────────────────────────────────┐
│               Next.js API Layer (TypeScript)                 │
│   - Authentication (better-auth)                             │
│   - Request validation (zod)                                 │
│   - Database queries (drizzle-orm)                          │
└─────────────────────┬───────────────────────────────────────┘
                      │ HTTP/gRPC calls
                      ▼
┌─────────────────────────────────────────────────────────────┐
│              Python Microservices (FastAPI)                  │
│                                                              │
│   ┌─────────────┐  ┌─────────────┐  ┌─────────────┐        │
│   │ AI Engine   │  │ KPI Engine  │  │ Report Gen  │        │
│   │ (extraction)│  │ (analytics) │  │ (PDF/Excel) │        │
│   └─────────────┘  └─────────────┘  └─────────────┘        │
└─────────────────────┬───────────────────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────────────────┐
│                 Shared PostgreSQL (Neon)                     │
└─────────────────────────────────────────────────────────────┘
```

---

## 🚀 Deployment Options

| Option | Description | Best For |
|--------|-------------|----------|
| **Vercel Functions** | Separate Vercel project with `python-services` root | Prod (Pro Plan) |
| **Railway / Render** | Dockerized long-running service | Prod (Hobby/Free) |
| **AWS Lambda** | Serverless Python functions | Heavy workloads |

> [!WARNING]
> **Vercel Timeout Warning:** 
> Vercel Hobby plan has a **10-second** timeout for serverless functions. AI extraction (OCR + GPT) often takes **15-45 seconds**. 
> - If using Vercel, you **must** be on a Pro plan (up to 300s).
> - Otherwise, use **Railway.app** or **Render.com** (no timeouts).

---

## 📁 Recommended Python Project Structure

```
infradyn-python/
├── app/
│   ├── main.py                 # FastAPI entry
│   ├── routers/
│   │   ├── extraction.py       # AI extraction endpoints
│   │   ├── kpi.py              # KPI calculations
│   │   └── reports.py          # Report generation
│   ├── services/
│   │   ├── ai_extraction.py    # OCR + GPT logic
│   │   ├── kpi_engine.py       # Analytics engine
│   │   ├── confidence.py       # Confidence scoring
│   │   └── report_engine.py    # PDF/Excel generation
│   └── models/
│       └── schemas.py          # Pydantic models
├── requirements.txt
├── Dockerfile
└── .env.example
```

---

## 🔌 API Contract Example

```python
# POST /api/extract-document
{
    "file_url": "s3://bucket/file.pdf",
    "document_type": "purchase_order"
}

# Response
{
    "success": true,
    "data": {
        "po_number": "PO-2026-001",
        "vendor_name": "Acme Corp",
        "total_value": 150000.00,
        "milestones": [...],
        "confidence": 0.92
    }
}
```

---

## ✅ Migration Priority Order

1. **Phase 1:** AI Extraction Engine → Immediate ROI (better OCR)
2. **Phase 2:** KPI Engine → Enhanced analytics with numpy/pandas
3. **Phase 3:** Report Engine → PDF/Excel generation with reportlab
4. **Phase 4:** Confidence Engine → ML-based confidence scoring

---

## 📝 Next Steps for Vercel Deployment

1. **Dashboard Setup:** 
   - Create a new Project on Vercel.
   - Point to your GitHub repo.
   - Set **Root Directory** to `python-services`.
2. **Environment Variables:**
   - Copy all keys from `python-services/.env` to Vercel Dashboard.
3. **Next.js Connection:**
   - In your **main Next.js project** env vars, set:
     `PYTHON_SERVICE_URL=https://your-python-service.vercel.app`
4. **Vercel Config:**
   - Use the `vercel.json` in `python-services/` (already created).
