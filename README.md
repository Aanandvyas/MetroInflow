# MetroInflow

One platform for ingesting, classifying, extracting, summarizing, and notifying around metro operations documents.

![Go](https://img.shields.io/badge/Backend-Go-00ADD8?logo=go)
![React](https://img.shields.io/badge/Frontend-React-61DAFB?logo=react)
![FastAPI](https://img.shields.io/badge/OCR-FastAPI-009688?logo=fastapi)
![PostgreSQL](https://img.shields.io/badge/DB-PostgreSQL-336791?logo=postgresql)

## Overview

MetroInflow combines:

- React frontend (user/admin workflows)
- Go backend API and background workers
- Python OCR service (PaddleOCR)
- Optional Python summary adapter in front of a local LLM server
- Supabase for auth/storage/database

The system supports:

- Document upload and department mapping
- OCR extraction for first pages or full image/PDF input
- Summary generation workflows
- Admin user management
- Notification flows (file notifications + quick share)

## Repository Layout

```text
MetroInflow/
├── backend/
│   ├── main.go
│   ├── config/
│   ├── handlers/
│   ├── models/
│   ├── services/
│   ├── ocr/
│   ├── summary_adapter.py
│   └── requirements.txt
├── frontend/
│   ├── src/
│   ├── public/
│   └── package.json
└── README.md
```

## Architecture

### Core runtime

- Frontend calls Go backend APIs.
- Backend stores metadata in PostgreSQL/Supabase and files in Supabase storage.
- Backend invokes OCR and summary services over HTTP.
- Background goroutines in backend poll DB tables for pending work.

### Background loops in backend

Running inside `backend/main.go`:

- Summary worker loop (every 3s)
	- Processes pending rows in `summary`
- Notification loop (every 10s)
	- Sends file-upload notifications from `notifications`
- Quick-share loop (every 10s)
	- Processes `quick_share` rows where `is_sent=false`

### Quick share recipient rule

Current logic:

- Prefer users with `position = 'head'` in the department
- If no head users exist, fallback to regular users
- If no recipients exist, mark row sent to avoid infinite retries

## Tech Stack

- Backend: Go 1.25+, `net/http`, `github.com/lib/pq`, `godotenv`
- Frontend: React (CRA), Tailwind CSS, Supabase JS client
- OCR service: FastAPI + PaddleOCR + PyMuPDF + Pillow
- Summary adapter: FastAPI + requests
- DB/Auth/Storage: Supabase
- Optional LLM backend: llama.cpp server exposing `/completion`

## Prerequisites

- Go 1.25+
- Node.js 18+
- Python 3.10+
- Supabase project (URL, anon key, service role key)

## Installation

```bash
git clone <your-repo-url>
cd MetroInflow

# backend
cd backend
go mod tidy

# frontend
cd ../frontend
npm install

# python services
cd ../backend
python -m pip install -r requirements.txt
```

## Environment Variables

Important:

- Never commit real secrets to git.
- Rotate any token/password already exposed in history or screenshots.

### Backend (`backend/.env`)

Required (core):

```env
PORT=8080
DATABASE_URL=postgresql://...

SUPABASE_URL=https://<project>.supabase.co
SUPABASE_ANON_KEY=<anon-key>
SUPABASE_SERVICE_KEY=<legacy-fallback-anon-key>
SUPABASE_SERVICE_ROLE_KEY=<service-role-key>

CORS_ALLOW_ORIGIN=http://localhost:3000
```

Required (OCR/summary service URLs used by backend):

```env
OCR_SERVICE_URL=http://127.0.0.1:8000/ocr
LLM_COMPLETION_URL=http://127.0.0.1:8081/completion
SUMMARY_SERVICE_URL=http://127.0.0.1:9000/summarize
OCR_TIMEOUT_SECONDS=300
```

Email options:

1) Gmail fallback mode:

```env
GMAIL_ADDRESS=<your-gmail>
GMAIL_APP_PASSWORD=<gmail-app-password>
```

2) Preferred custom SMTP mode:

```env
SMTP_HOST=<smtp-host>
SMTP_PORT=<smtp-port>
SMTP_USERNAME=<smtp-username>
SMTP_PASSWORD=<smtp-password>
SMTP_FROM=<from-address>
```

If `SMTP_*` values are present, backend uses those first. Otherwise it falls back to `GMAIL_*`.

### Frontend (`frontend/.env`)

```env
REACT_APP_API_URL=http://localhost:8080
REACT_APP_SUPABASE_URL=https://<project>.supabase.co
REACT_APP_SUPABASE_ANON_KEY=<anon-key>
REACT_APP_REDIRECT_URL=http://localhost:3000/login

# Used only if frontend creates admin users directly from browser code
REACT_APP_SUPABASE_SERVICE_ROLE_KEY=<service-role-key>
```

## Running Locally

## Minimal local (frontend + backend + OCR)

Terminal 1: OCR service

```bash
cd backend/ocr
uvicorn app:app --host 0.0.0.0 --port 8000
```

Terminal 2: Backend

```bash
cd backend
go run main.go
```

Terminal 3: Frontend

```bash
cd frontend
npm start
```

## Full hybrid stack (local services exposed to deployed backend)

Use 6 terminals:

1. OCR service on 8000
2. LLM service on 8081
3. Summary adapter on 9000
4. Cloudflare tunnel for OCR (`127.0.0.1:8000`)
5. Cloudflare tunnel for LLM (`127.0.0.1:8081`)
6. Cloudflare tunnel for summary (`127.0.0.1:9000`)

Summary adapter start command:

```bash
cd backend
python -m uvicorn summary_adapter:app --host 0.0.0.0 --port 9000
```

Cloudflare quick tunnel example:

```bash
cloudflared tunnel --url http://127.0.0.1:9000
```

Note on quick tunnels:

- `*.trycloudflare.com` URL changes every restart.
- If deployed backend points to quick tunnel URLs, you must update backend env vars and redeploy each time.
- Prefer named tunnels for stable URLs.

## API Surface (Backend)

Main routes registered in `backend/main.go`:

- `POST /v1/documents`
- `POST /v1/documents/process-first-10-pages`
- `GET /v1/documents/process-first-10-pages/status`
- `POST /v1/summary/generate`
- `GET /v1/summary/status`
- `POST /v1/llm/generate`
- `POST /v1/llm/summarize`
- `GET /health`
- `POST /v1/admin/login`
- `POST /v1/admin/logout`
- `GET/POST/PUT/DELETE /v1/admin/users`

## Processing Workflows

### Upload -> OCR -> summary -> notification

- Upload starts via `/v1/documents`
- File metadata inserted
- OCR and summary attempt in async goroutine
- Notification row inserted for authenticated uploader
- Email send attempted using SMTP helper

### Summary queue worker

- Queue row inserted in `summary` with state `pending`
- Worker marks progress states (`processing`, `downloading_file`, etc.)
- On success stores final summary metrics
- On failure stores `failed` state + error message

### Quick-share worker

- Reads unsent rows from `quick_share`
- Resolves users by department
- Sends emails to head users or fallback regular users
- Marks row sent if delivery succeeded

## Deployment Notes

## Backend on Render

- Must bind `PORT` from environment.
- Ensure `DATABASE_URL`, Supabase keys, and service URLs are set.
- For local services via tunnels, set:
	- `OCR_SERVICE_URL`
	- `LLM_COMPLETION_URL`
	- `SUMMARY_SERVICE_URL`

## Frontend on Vercel

- Set `REACT_APP_API_URL` to deployed backend.
- Set `REACT_APP_REDIRECT_URL` to deployed login URL.
- Add redirect URL allow-list in Supabase Auth URL configuration.

## Email in cloud deployments

- Local SMTP may work while cloud SMTP fails.
- `dial tcp ...:587: connect: connection timed out` indicates outbound SMTP network restriction.
- Use transactional providers (Resend, SendGrid, Mailgun, Postmark, SES) with their SMTP settings.

## Troubleshooting

### No quick-share emails

Check logs for:

- `[QUICK_SHARE] Sending email to ...`
- `[QUICK_SHARE] Failed to send email: ...`
- `[QUICK_SHARE] Email sent to: ...`

If only polling logs appear and no send logs:

- verify recipients exist for that department
- verify `is_sent` status and row contents

### OCR call errors

- Ensure OCR service is up and reachable from backend URL in `OCR_SERVICE_URL`
- Avoid `localhost` IPv6 issues by using `127.0.0.1`

### Summary adapter not reachable

- Verify `summary_adapter.py` is running on port 9000
- Verify `SUMMARY_SERVICE_URL` includes `/summarize`

### Supabase auth email rate limit exceeded

- This is separate from custom SMTP mail flow.
- Happens on auth email endpoints (`/magiclink`, `/resend`).
- Use cooldown or manual verification during stress tests.

## Security Checklist

- Rotate any leaked keys/tokens/passwords immediately.
- Keep service-role keys server-side only whenever possible.
- Use dedicated SMTP credentials for production.
- Restrict CORS and redirect URLs to known origins.

## Validation Commands

Backend build:

```bash
cd backend
go build ./...
```

Frontend build:

```bash
cd frontend
npm run build
```

Health checks:

```bash
curl http://127.0.0.1:8080/health
curl http://127.0.0.1:8000/health
curl http://127.0.0.1:9000/health
```

## Contributing

- Keep changes small and focused.
- Run backend/frontend build checks before PR.
- Include reproducible steps for bug fixes.

