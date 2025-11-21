# MetroInflow
>WORK IN PROGRESS
> Document Management System for Metro Rail Organizations
> 

## 📋 Overview

MetroInflow is a comprehensive document management and workflow system designed for metro rail organizations. It provides secure document storage, OCR capabilities, AI-powered summarization, multi-department collaboration, and role-based access control.

## 🏗️ Architecture

### Backend (Go + Python)
- **Go Server**: Main API server handling document operations, file management, and database interactions
- **Python OCR Service**: PaddleOCR-based text extraction from PDFs and images
- **Python ML Service**: Text summarization using Hugging Face transformers

### Frontend (React)
- **React 19**: Modern UI with React Router for navigation
- **Supabase Integration**: Authentication, real-time database, and file storage
- **Tailwind CSS**: Responsive design system

### Database
- **PostgreSQL (Supabase)**: User management, departments, roles, documents metadata
- **Supabase Storage**: Document file storage with secure access

## 🚀 Features

- **Document Management**: Upload, view, search, and organize documents across departments
- **OCR Processing**: Automatic text extraction from scanned documents and images
- **AI Summarization**: Generate concise summaries of document content
- **Role-Based Access**: Admin, Department Head, and User roles with specific permissions
- **Multi-Department Collaboration**: Share and collaborate on documents across departments
- **Approval Workflow**: Department heads can approve/reject document access requests
- **Notifications System**: Real-time notifications for assignments and approvals
- **Quick Share**: Instant file sharing between department heads
- **Calendar View**: Track document uploads and assignments by date
- **Important Files**: Mark and filter important documents
- **Admin Dashboard**: User management, department setup, role configuration

## 📦 Tech Stack

### Backend
- Go 1.x
- Python 3.13
- FastAPI
- PaddleOCR & PaddlePaddle
- Transformers (Hugging Face)
- Supabase Go Client

### Frontend
- React 19.1.1
- React Router 7.8.2
- Supabase JS Client 2.57.2
- Tailwind CSS 3.4.17
- Heroicons

### Infrastructure
- Supabase (PostgreSQL + Storage + Auth)
- SMTP (Gmail) for notifications

## 🛠️ Setup Instructions

### Prerequisites
- Go 1.18+
- Python 3.13+
- Node.js 20+
- npm or yarn
- Supabase account

### Environment Variables

#### Backend (`/backend/.env`)
```env
SUPABASE_URL=your_supabase_project_url
SUPABASE_SERVICE_KEY=your_service_role_key
DATABASE_URL=your_postgres_connection_string
PORT=8080
GMAIL_ADDRESS=your_gmail_address
GMAIL_APP_PASSWORD=your_gmail_app_password
HF_API_KEY=your_huggingface_api_key
```

#### Frontend (`/frontend/.env`)
```env
REACT_APP_SUPABASE_URL=your_supabase_project_url
REACT_APP_SUPABASE_ANON_KEY=your_anon_key
REACT_APP_SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
REACT_APP_REDIRECT_URL=http://localhost:3000/login
REACT_APP_API_URL=http://localhost:8080/v1
```

### Installation

#### 1. Backend Setup

```bash
cd backend

# Install Go dependencies
go mod download

# Set up Python virtual environment
python3 -m venv project_env
source project_env/bin/activate  # On Windows: project_env\Scripts\activate

# Install Python dependencies
pip install -r requirements.txt

# Download NLTK data (for summarization)
python -c "import nltk; nltk.download('punkt')"
```

#### 2. Frontend Setup

```bash
cd frontend

# Install dependencies
npm install

# or
yarn install
```

### Running the Application

#### Start Backend Services

**Terminal 1 - Go API Server:**
```bash
cd backend
go run main.go
```

**Terminal 2 - OCR Service:**
```bash
cd backend
source project_env/bin/activate
python ocr/app.py
```

**Terminal 3 - Summarization Service:**
```bash
cd backend
source project_env/bin/activate
python ml_collab/app.py
```

#### Start Frontend

**Terminal 4 - React App:**
```bash
cd frontend
npm run dev
```

The application will be available at:
- Frontend: http://localhost:3000
- Go API: http://localhost:8080
- OCR Service: http://localhost:8000
- ML Service: http://localhost:9000

## 📁 Project Structure

```
MetroInflow/
├── backend/
│   ├── config/         # Configuration and Supabase client
│   ├── handlers/       # HTTP request handlers
│   ├── models/         # Data models
│   ├── services/       # Business logic (OCR, summarization)
│   ├── utils/          # Helper functions (email notifications)
│   ├── ocr/           # PaddleOCR service
│   ├── ml_collab/     # Summarization service
│   ├── project_env/   # Python virtual environment
│   └── main.go        # Go server entry point
│
└── frontend/
    ├── src/
    │   ├── Admin/           # Admin dashboard components
    │   ├── components/      # Reusable UI components
    │   │   ├── assign-to-me/
    │   │   ├── authpage/
    │   │   ├── context/
    │   │   ├── header/
    │   │   ├── main/
    │   │   ├── sidebar/
    │   │   └── ui/
    │   ├── departmenthead/  # Department head features
    │   ├── utils/           # Utility functions
    │   ├── supabaseClient.jsx
    │   └── Router.jsx
    └── public/
```

## 🔐 User Roles

1. **Admin**
   - Manage users, departments, and roles
   - View all files across departments
   - System configuration

2. **Department Head**
   - Approve/reject document access
   - Collaborate with other departments
   - Quick share files
   - View department analytics

3. **User**
   - Upload documents
   - View assigned documents
   - Mark important files
   - Receive notifications

## 🔄 Key Workflows

### Document Upload Flow
1. User uploads document with department assignment
2. Backend stores file in Supabase Storage
3. OCR service extracts text (for scanned documents)
4. Summarization service generates summary
5. Metadata saved to database
6. Notifications sent to department heads

### Approval Flow
1. User requests access to document
2. Department head receives notification
3. Department head approves/rejects request
4. User receives notification of decision
5. If approved, user gains access to document

## 🧪 Testing

```bash
# Backend test
cd backend
go run tests/testDB.go

# Frontend test
cd frontend
npm test
```

## 🔧 Configuration

### Database Schema
The application expects the following main tables in Supabase:
- `users` - User profiles with roles and departments
- `departments` - Department information
- `roles` - Available user roles
- `documents` - Document metadata
- `files` - File records
- `files_depts` - Many-to-many relationship for file-department access
- `notifications` - User notifications
- `quick_share` - Quick share messages between departments

### Storage Buckets
- `documents` - Main document storage bucket

## 📝 API Endpoints (yet to be reviewed)

### Documents
- `POST /v1/upload` - Upload documents
- `GET /v1/documents` - List documents
- `GET /v1/documents/:id` - Get document details

### Files
- `GET /v1/files/:uuid` - Get file metadata

### OCR & Summarization
- `POST /ocr` - Extract text from document
- `POST /summarize` - Generate document summary

## 🐛 Known Issues

- Ensure all three backend services (Go, OCR, ML) are running for full functionality
- First summarization request may be slow due to model loading
- OCR works best with clear, high-contrast images