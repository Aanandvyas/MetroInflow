# Large Document Processing Pipeline (First 10 Pages + Summary)

## Problem Statement
- **File Size**: 40MB PDFs
- **Pages to Extract**: First 10 pages only (ignore rest)
- **Goal**: Extract text from first 10 pages → Summarize extracted text
- **Constraints**: Limited local RAM (16GB), M4 Mac processing power

---

## Simplified Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    FRONTEND (React)                         │
│  - File upload (drag-drop, progress bar)                   │
│  - Display extraction + summarization progress             │
│  - Show extracted text & summary                           │
└──────────────────────────┬──────────────────────────────────┘
                           │
                           ↓ Upload PDF
┌──────────────────────────────────────────────────────────────┐
│              BACKEND (Go) - Simple Orchestration             │
│  ┌─────────────────────────────────────────────────────────┐ │
│  │ POST /v1/documents/extract-first-10                     │ │
│  │ - Accept PDF file                                       │ │
│  │ - Extract first 10 pages                                │ │
│  │ - Return extracted text                                 │ │
│  └─────────────────────────────────────────────────────────┘ │
│  ┌─────────────────────────────────────────────────────────┐ │
│  │ POST /v1/documents/summarize-extracted                  │ │
│  │ - Accept extracted text                                 │ │
│  │ - Send to LLM                                           │ │
│  │ - Return summary                                        │ │
│  └─────────────────────────────────────────────────────────┘ │
└──────────────┬──────────────────────────────┬─────────────────┘
               │                              │
               ↓ (First 10 pages)            ↓ (Extracted text)
        ┌──────────────────┐          ┌────────────────────┐
        │  OCR Service     │          │  LLM Service       │
        │ (PaddleOCR)      │          │ (Llama on 8081)    │
        │ Python FastAPI   │          │                    │
        │                  │          │ Single request     │
        │ ~3 seconds/page  │          │ ~2 seconds         │
        └──────────────────┘          └────────────────────┘
               ↑                              ↑
          (10 pages)                    (extracted text)
```

---

## Phase 1: File Upload & OCR Extraction (First 10 Pages Only)

### Frontend
```
1. User selects file (40MB PDF)
2. Display: "Uploading... 0%"
3. Upload full file
4. On completion: Show "Extracting first 10 pages..."
5. Display extracted text as it arrives
```

### Backend
```
POST /v1/documents/extract-first-10
- Accept PDF file
- Extract only pages 1-10 from PDF
- Run PaddleOCR on those 10 pages
- Return combined extracted text
- Time: ~10 pages × 0.3s = 3 seconds
```

### Simple Implementation
```go
handlers/extract.go:

type ExtractRequest struct {
    File multipart.File
}

// POST /v1/documents/extract-first-10
func ExtractFirstTenPagesHandler(w http.ResponseWriter, r *http.Request) {
    // 1. Parse multipart form (PDF file)
    // 2. Save to temp location
    // 3. POST to OCR service with page_range: "1-10"
    // 4. Get extracted text back
    // 5. Return extracted text + confidence
}
```

---

## Phase 2: Summarize Extracted Text

### Backend
```
POST /v1/documents/summarize-extracted
Request: { "extracted_text": "..." }

- Validate text not empty
- Send to LLM at localhost:8081
- Return summary
- Time: ~2 seconds
```

### Implementation
```go
// Use existing LLMSummarizeHandler
// Just wrap extracted text into request
func SummarizeExtractedTextHandler(w http.ResponseWriter, r *http.Request) {
    var req ExtractedTextRequest
    json.NewDecoder(r.Body).Decode(&req)
    
    // Forward to LLM handler
    handlers.LLMSummarizeHandler(w, r, req.Text)
}
```

---

## Single Endpoint Alternative (Recommended)

Combine both operations into one seamless endpoint:

```
POST /v1/documents/process-first-10-pages

Request:
{
    "file": <PDF binary>
}

Response:
{
    "extracted_text": "...",
    "extracted_text_length": 3457,
    "ocr_confidence": 0.94,
    "summary": "...",
    "extraction_time_ms": 3200,
    "summarization_time_ms": 2100
}
```

**Total time**: ~5 seconds end-to-end

---

## Database Schema (Minimal)

```sql
CREATE TABLE document_processing_results (
    result_id UUID PRIMARY KEY,
    user_id UUID NOT NULL,
    original_filename TEXT,
    original_size_bytes INT,
    extracted_text TEXT,
    extracted_text_length INT,
    ocr_confidence FLOAT,
    summary TEXT,
    extraction_time_ms INT,
    summarization_time_ms INT,
    created_at TIMESTAMP
);
```

---

## Timeline & Simplicity

```
Upload PDF           1-2 seconds
↓
OCR first 10 pages   ~3 seconds
↓
Summarize text       ~2 seconds
────────────────────────────────
TOTAL                ~5-7 seconds
```

**Memory**: ~200MB (just 10 pages, not 500)
**Complexity**: Very low (2 sequential API calls)
**User Experience**: Fast feedback, simple UI

---

## Frontend Display

```
1. Upload form (drag-drop)
2. Progress bar during extraction
3. Display extracted text in text area
4. Display summary below
5. Options:
   - Copy extracted text
   - Copy summary
   - Download both as .txt
   - Process another file
```

---

## Error Handling

```
1. Invalid PDF format
   → Show error message
   → Offer re-upload

2. PDF has < 10 pages
   → Extract all available pages
   → Proceed with summarization

3. OCR service down
   → Show "Extraction service unavailable"
   → Retry button

4. LLM service down
   → Show extracted text
   → "Summary temporarily unavailable" message

5. OCR low confidence
   → Show warning: "Low confidence (XX%)"
   → Show extracted text anyway
```

---

## Implementation Checklist

**Backend (Go)**
- [ ] Extract first 10 pages endpoint
- [ ] Summarize extracted text endpoint
- [ ] Combined process endpoint (recommended)
- [ ] File upload handling
- [ ] Error handling
- [ ] Database schema

**Frontend (React)**
- [ ] File upload component
- [ ] Progress indicator
- [ ] Extracted text display
- [ ] Summary display
- [ ] Copy/download buttons

**Database**
- [ ] Single table for results

---

## Summary

This is a **MUCH simpler plan**:
- Extract only first 10 pages (not 500)
- Single summarization pass (not 3 levels)
- ~5 seconds total (not 7 minutes)
- Minimal database schema
- No session management needed
- No batch processing complexity

Ready to implement?


---

## Architecture Plan

```
┌─────────────────────────────────────────────────────────────┐
│                    FRONTEND (React)                         │
│  - File upload (drag-drop, progress bar)                   │
│  - Display extraction/summarization progress               │
│  - Show partial results as they arrive                     │
│  - Cache results locally                                   │
└──────────────────────────┬──────────────────────────────────┘
                           │
                           ↓ Upload with session ID
┌──────────────────────────────────────────────────────────────┐
│              BACKEND (Go) - Orchestration                     │
│  ┌─────────────────────────────────────────────────────────┐ │
│  │ POST /v1/documents/process (chunked upload)             │ │
│  │ - Accept file chunks (streaming)                        │ │
│  │ - Validate PDF                                          │ │
│  │ - Store temp file                                       │ │
│  │ - Return session ID                                     │ │
│  └─────────────────────────────────────────────────────────┘ │
│  ┌─────────────────────────────────────────────────────────┐ │
│  │ GET /v1/documents/{sessionId}/status                    │ │
│  │ - Poll for progress                                     │ │
│  │ - Return extracted pages + summary status               │ │
│  └─────────────────────────────────────────────────────────┘ │
│  ┌─────────────────────────────────────────────────────────┐ │
│  │ Queue System (goroutines)                               │ │
│  │ - Manages long-running extraction jobs                  │ │
│  │ - Batches OCR requests                                  │ │
│  │ - Streams progress back to frontend                     │ │
│  └─────────────────────────────────────────────────────────┘ │
└──────────────┬──────────────────────────────┬─────────────────┘
               │                              │
               ↓ (Batch of pages)            ↓ (Extracted text)
        ┌──────────────────┐          ┌────────────────────┐
        │  OCR Service     │          │  LLM Service       │
        │ (PaddleOCR)      │          │ (Llama on 8081)    │
        │ Python FastAPI   │          │                    │
        │ Port: XXXX       │          │ Chunked summaries  │
        │                  │          │ Batch processing   │
        │ Max 3 pages/sec  │          │                    │
        └──────────────────┘          └────────────────────┘
               ↑                              ↑
          (pages in)                    (text chunks in)
```

---

## Phase 1: File Upload & Validation (Frontend + Backend)

### Frontend
```
1. User selects file (40MB PDF)
2. Display: "Uploading... 0%"
3. Chunk file into 5MB pieces
4. Upload chunks sequentially with session ID
5. On completion: Start polling status endpoint
```

### Backend
```
1. POST /v1/documents/process/init
   - Generate session ID
   - Create temp directory for session
   - Return session ID to frontend

2. POST /v1/documents/process/chunk/{sessionId}
   - Accept 5MB chunk
   - Write to disk
   - Update progress
   - Return chunk count received

3. POST /v1/documents/process/finalize/{sessionId}
   - Verify all chunks received
   - Concatenate into final PDF
   - Validate PDF integrity
   - Queue for extraction
   - Return: { status: "queued", estimated_time: "120s" }
```

---

## Phase 2: OCR Text Extraction (500 pages → 500 text files)

### Strategy: Page Batch Processing
**Problem**: Extracting all 500 pages serially = 500 * 0.3s = 150 seconds
**Solution**: Batch + parallel processing

```
Configuration:
- Process 3 pages in parallel (PaddleOCR instances)
- Each OCR takes ~0.3s per page
- Total time: ~50 seconds for 500 pages
- Memory: ~100MB per OCR process (keep under 2GB total)

Batch Flow:
1. Split PDF into batches of 10 pages
2. Queue batches (50 batches total)
3. Process 1 batch at a time (3 pages parallel)
4. Store extracted text per page in database
5. Stream progress back to frontend: "Extracted 123/500 pages"
```

### Backend Implementation
```go
// Queue manager in main.go
type ExtractionJob struct {
    SessionID   string
    PDFPath     string
    TotalPages  int
    PagesProcessed int
}

// Goroutine pool for OCR
ExtractionQueue := make(chan ExtractionJob, 100)
for i := 0; i < 3; i++ {
    go ProcessExtractionBatch(ExtractionQueue)
}

// For each batch:
- Split PDF pages into chunks
- POST to OCR service
- Store results in DB: documents_extracted_text table
- Update job status (percentage)
```

### Database Schema (additions)
```sql
-- Store extraction progress & results
CREATE TABLE document_extraction_sessions (
    session_id UUID PRIMARY KEY,
    user_id UUID NOT NULL,
    original_filename TEXT,
    total_pages INT,
    pages_extracted INT DEFAULT 0,
    status TEXT, -- 'uploading', 'extracting', 'summarizing', 'complete', 'failed'
    created_at TIMESTAMP,
    started_at TIMESTAMP,
    completed_at TIMESTAMP
);

CREATE TABLE extracted_pages (
    page_id UUID PRIMARY KEY,
    session_id UUID REFERENCES document_extraction_sessions,
    page_number INT,
    extracted_text TEXT,
    ocr_confidence FLOAT,
    extracted_at TIMESTAMP
);
```

---

## Phase 3: Smart Summarization (Chunked LLM Processing)

### Strategy: Hierarchical Summarization
**Problem**: 500 pages = ~100,000 tokens. LLM context is 2048 tokens.
**Solution**: Multi-level summarization

```
Level 1: Page Summaries (500 pages)
- Group extracted text into 5-page chunks
- Send each chunk to LLM: "Summarize in 50 tokens"
- Get 100 summaries (one per 5-page group)
- Time: 100 * 2s = 200 seconds

Level 2: Section Summaries (by document regions)
- Group 100 summaries into 5 sections
- Send each section: "Summarize these 5 summaries into 100 tokens"
- Get 20 section summaries
- Time: 20 * 1.5s = 30 seconds

Level 3: Final Summary
- Combine 20 summaries: "Final summary in 200 tokens"
- Time: 1 * 2s = 2 seconds

Total: ~240 seconds ≈ 4 minutes
```

### Backend Implementation
```go
POST /v1/documents/{sessionId}/summarize

1. Wait for extraction to complete
2. Fetch all extracted_pages from DB
3. Group into 5-page chunks
4. Batch POST to LLM handler:
   - /v1/llm/summarize (5-page chunk at a time)
   - Queue 100 jobs
5. Process queue with rate limiting (1 LLM request per 2 seconds)
6. Store all summaries in DB
7. Stream progress: "Summarizing... 45/100 sections"
8. Trigger hierarchical summarization when all page summaries done
```

### Database Addition
```sql
CREATE TABLE summary_levels (
    summary_id UUID PRIMARY KEY,
    session_id UUID REFERENCES document_extraction_sessions,
    level INT, -- 1: page summaries, 2: section, 3: final
    section_num INT, -- which section in that level
    summary_text TEXT,
    source_pages TEXT[], -- which pages this came from
    created_at TIMESTAMP
);
```

---

## Phase 4: Streaming Progress to Frontend

### WebSocket Alternative (for real-time updates)
```go
// In main.go
http.HandleFunc("/ws/documents/{sessionId}/progress", WebSocketProgressHandler)

// Client connects and receives:
// { "event": "extraction_progress", "pages": 123, "total": 500 }
// { "event": "extraction_complete", "extraction_time": "45s" }
// { "event": "summarization_start", "total_groups": 100 }
// { "event": "summarization_progress", "summaries": 35, "total": 100 }
// { "event": "summarization_complete", "summary": "..." }
```

### API Polling Fallback (simpler, no WebSocket)
```
Frontend polls every 2 seconds:
GET /v1/documents/{sessionId}/status

Response:
{
    "status": "summarizing",
    "extraction": { "pages": 500, "confidence": 0.92 },
    "summarization": {
        "level": 2,
        "progress": 35,
        "total": 100
    },
    "estimated_completion": "2026-03-25T10:35:00Z"
}
```

---

## Phase 5: Results Storage & Display

### Frontend Display
```
After completion, show:
1. Document title + metadata (pages, size, extraction time)
2. Extraction quality metrics (avg OCR confidence)
3. Final summary (Level 3)
4. List of section summaries (Level 2)
5. Option to view extracted text by page or section
6. Download options:
   - Full extracted text (.txt)
   - Summary (.txt or PDF)
   - Structured JSON with all levels
```

### Database Final Schema
```sql
CREATE TABLE documents_final (
    doc_id UUID PRIMARY KEY,
    user_id UUID NOT NULL,
    original_filename TEXT,
    original_size_bytes INT,
    total_pages INT,
    extracted_text BYTEA, -- compressed
    final_summary TEXT,
    hierarchy_json JSONB, -- all 3 levels of summaries
    metadata JSONB, -- { extraction_time, ocr_avg_confidence, llm_time, etc }
    created_at TIMESTAMP,
    accessed_at TIMESTAMP
);
```

---

## Optimization Strategies

### Memory Management
```
1. Stream PDF reading (don't load entire 40MB into RAM)
2. Process pages in batches of 10 (not all 500 at once)
3. Delete temp files immediately after processing
4. Use database for state, not in-memory cache
```

### Speed Optimization
```
1. Parallel OCR: 3 pages at once = 3x speedup
2. Batch LLM requests: queue them, don't wait for each response
3. Cache OCR results: if same file uploaded twice, reuse
4. Incremental summarization: start while extraction still happening
```

### Cost Optimization (if using cloud LLM later)
```
1. Summarize 5 pages → 1 summary (80% content compression)
2. Use cheaper model for page summaries, better model for final
3. Cache summaries at each level
4. Offer "quick summary" (fewer levels) vs "detailed summary"
```

---

## Timeline & Complexity

### Happy Path (No Errors)
```
1. Upload (chunked)          2 minutes  (5MB chunks)
2. OCR extraction            1 minute   (500 pages parallel)
3. Page summaries            3 minutes  (100 batches)
4. Section summaries         1 minute   (20 batches)
5. Final summary             10 seconds (1 request)
────────────────────────────────────
TOTAL                        ~7 minutes
```

### User Experience
```
- Real-time progress: "Uploading 80%"
- Estimated completion shown
- Partial results displayed (e.g., can view extracted text while summarizing)
- Can cancel and retry
```

---

## Error Handling & Recovery

### Failure Points & Solutions
```
1. PDF corruption
   → Validate on upload
   → Show user clear error
   → Offer re-upload

2. OCR failure on specific pages
   → Skip page, log error
   → Mark page as "extraction failed"
   → Continue with remaining pages
   → Alert user at end

3. LLM server down
   → Queue summary requests
   → Show "Waiting for summarization..."
   → Retry when server back up
   → Persist queue in database

4. Network interruption
   → Resume from last completed chunk
   → Session persists on server
   → User can refresh and check status

5. User cancels mid-process
   → Stop new jobs
   → Save what was completed
   → Offer "continue" or "start over"
```

---

## Implementation Checklist

**Backend (Go)**
- [ ] File upload endpoints (chunked)
- [ ] Session management
- [ ] Job queue system
- [ ] Progress tracking
- [ ] Database schema additions
- [ ] OCR batch processor
- [ ] LLM batch processor (hierarchical)
- [ ] WebSocket or polling endpoint
- [ ] Error handling & recovery

**Frontend (React)**
- [ ] File upload component (drag-drop)
- [ ] Progress bar (upload, extraction, summarization)
- [ ] Results viewer (pages, sections, final summary)
- [ ] Polling/WebSocket connection
- [ ] Error messages & retry UI
- [ ] Download options

**Database (Supabase)**
- [ ] New tables (sessions, extracted_pages, summary_levels, documents_final)
- [ ] Indexes for user_id, session_id
- [ ] Cleanup policy (delete old sessions after 30 days)

---

## Questions to Confirm

1. **Display preference**: Want to show results as they arrive, or wait for complete processing?
2. **Storage**: Keep extracted text indefinitely, or delete after X days?
3. **Summarization levels**: Do you want 3-level hierarchy, or prefer "quick" vs "detailed" mode?
4. **Caching**: If same PDF uploaded twice, reuse results?
5. **OCR confidence threshold**: Skip pages below 50% confidence?

---

## Alternative: Simpler Approach (if 7 minutes is too long)

```
Instead of hierarchical summarization:

1. Group PDF into sections (every 50 pages)
2. Extract + summarize each section independently
3. Show section summaries to user
4. Let user request "final summary" which combines sections

Benefit: Don't waste time on level 2 summaries
Trade-off: User has to piece together larger documents
```

