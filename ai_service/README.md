# VerifyMe AI Detection Microservice

An isolated Python FastAPI microservice that provides the **integration architecture** for AI-generated media detection in VerifyMe.

> **Current Status — Development Stub**
> This service currently operates as a structured placeholder. The `/api/v1/detect` endpoint accepts image uploads and returns a well-typed response, but **no machine learning model is loaded**. The detector returns a fixed response (`is_ai_generated: false, confidence: 0.0`) until model weights are integrated.
>
> To enable real detection, replace the stub in `app/detector.py` with a loaded model (e.g., from Hugging Face) and update `analyze_image()` to run inference.

---

## 📁 Directory Structure

```text
ai_service/
├── app/
│   ├── __init__.py       # Package initialization
│   ├── main.py           # FastAPI entry point & HTTP route definitions
│   ├── detector.py       # Detection engine & model interface
│   └── schemas.py        # Pydantic data schemas & response validation
├── requirements.txt      # Python dependencies
├── .env.example          # Environment variable template
└── README.md             # Service documentation
```

---

## 🚀 Setup & Execution

### 1. Create a Virtual Environment

```bash
cd ai_service
python -m venv venv

# Windows:
venv\Scripts\activate

# Linux/macOS:
source venv/bin/activate
```

### 2. Install Dependencies

```bash
pip install -r requirements.txt
```

### 3. Start the Microservice

```bash
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

The interactive API documentation (Swagger UI) will be available at:
👉 **`http://localhost:8000/docs`**

---

## 📡 API Endpoints

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/` | Service root and metadata |
| `GET` | `/health` | Health check & model status |
| `POST` | `/api/v1/detect` | Upload media for analysis (returns stub response until model is integrated) |
