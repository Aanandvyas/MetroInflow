# MetroInflow

One platform to ingest, summarize, and route mission-critical metro operations documents.

![Go](https://img.shields.io/badge/Backend-Go-00ADD8?logo=go)
![React](https://img.shields.io/badge/Frontend-React-61DAFB?logo=react)
![FastAPI](https://img.shields.io/badge/OCR-FastAPI-009688?logo=fastapi)
![PostgreSQL](https://img.shields.io/badge/DB-PostgreSQL-336791?logo=postgresql)

## 1. Project Overview

### Problem Statement

Metro organizations process high volumes of mixed-format documents across departments (engineering, maintenance, legal, HR, procurement, compliance). Manual review causes delayed decisions, duplicated work, siloed context, and compliance risk.

### Key Features

- Multi-document upload and department mapping
- OCR extraction pipeline for scanned PDFs/images
- Background summary workflow using queue + worker model
- Status/state tracking per summary job in database
- Role-aware admin/user flows
- Email and quick-share notification integrations

### Screenshots/GIFs

- Add UI screenshots here (Dashboard, Upload, Summary view, Admin pages)
- Suggested path: `frontend/src/assets/readme/`

## 2. Tech Stack

- Backend: Go (net/http), PostgreSQL, Supabase (storage + auth)
- Frontend: React (Create React App), Tailwind CSS
- OCR service: FastAPI, PaddleOCR, PyMuPDF, Pillow
- AI workflow: OCR extraction + LLM completion endpoint

## 3. Getting Started

### Prerequisites

- Go 1.25+
- Node.js 18+
- Python 3.10+
- PostgreSQL/Supabase project

### Installation

```bash
git clone https://github.com/yourusername/MetroInflow.git
cd MetroInflow

# Backend deps
cd backend
go mod tidy

# Frontend deps
cd ../frontend
npm install

# OCR deps
cd ../backend/ocr
python -m pip install -r ../requirements.txt
```

### Configuration

Create backend env file (`backend/.env`):

```env
PORT=8080
DATABASE_URL=postgres://...

SUPABASE_URL=https://<project>.supabase.co
SUPABASE_ANON_KEY=<anon-or-service-key>
SUPABASE_SERVICE_KEY=<optional-legacy-fallback>
SUPABASE_SERVICE_ROLE_KEY=<service-role-key>

OCR_SERVICE_URL=http://localhost:8000/ocr
LLM_COMPLETION_URL=http://localhost:8081/completion
OCR_TIMEOUT_SECONDS=300
```

Create frontend env file (`frontend/.env`):

```env
REACT_APP_API_URL=http://localhost:8080
REACT_APP_SUPABASE_URL=https://<project>.supabase.co
REACT_APP_SUPABASE_ANON_KEY=<anon-key>
REACT_APP_SUPABASE_SERVICE_ROLE_KEY=<service-role-key-if-used>
REACT_APP_REDIRECT_URL=http://localhost:3000/login
```

## 4. Usage

Run services in separate terminals.

### Start OCR service

```bash
cd backend/ocr
PADDLE_PDX_DISABLE_MODEL_SOURCE_CHECK=True uvicorn app:app --host 0.0.0.0 --port 8000
```

### Start backend

```bash
cd backend
go run main.go
```

### Start frontend

```bash
cd frontend
npm start
```

### Example API endpoints

- `POST /v1/documents`
- `GET /health`
- `POST /v1/admin/login`
- `POST /v1/admin/logout`
- `GET/POST/PUT/DELETE /v1/admin/users`

## 5. Project Structure

```text
MetroInflow/
├── backend/
│   ├── main.go
│   ├── config/
│   ├── handlers/
│   ├── models/
│   ├── services/
│   ├── ocr/
│   └── tests/
├── frontend/
│   ├── src/
│   ├── public/
│   └── package.json
├── README.md
└── WORKFLOW_DEEP_DIVE.md
```

## 6. Roadmap and Contributing

### Roadmap

- Re-enable and document all summary REST routes in backend router
- Improve queue observability and retry controls
- Add integration tests for OCR and summary workflows
- Harden frontend summary polling and status UX

### Contributing

- Fork the repository
- Create a feature branch
- Keep commits focused and small
- Run backend and frontend build checks before opening PR
- Open a PR with clear test notes

If contribution volume increases, add a dedicated `CONTRIBUTING.md`.
