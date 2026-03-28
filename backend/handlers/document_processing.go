package handlers

import (
	"bytes"
	"crypto/rand"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"io"
	"log"
	"mime/multipart"
	"net/http"
	"os"
	"regexp"
	"strconv"
	"strings"
	"sync"
	"time"

	"backend/config"
	"backend/models"
)

// ProcessFirst10PagesRequest wraps the multipart file upload
type ProcessFirst10PagesRequest struct {
	File     []byte
	Filename string
	UserID   string
}

// ProcessFirst10PagesResponse is the final response with extracted text and summary
type ProcessFirst10PagesResponse struct {
	ResultID            string  `json:"result_id"`
	ExtractedText       string  `json:"extracted_text"`
	ExtractedTextLength int     `json:"extracted_text_length"`
	OCRConfidence       float64 `json:"ocr_confidence"`
	Summary             string  `json:"summary"`
	ExtractionTimeMs    int     `json:"extraction_time_ms"`
	SummarizationTimeMs int     `json:"summarization_time_ms"`
	TotalTimeMs         int     `json:"total_time_ms"`
}

type asyncJobStatus struct {
	JobID      string                       `json:"job_id"`
	Status     string                       `json:"status"`
	Error      string                       `json:"error,omitempty"`
	Result     *ProcessFirst10PagesResponse `json:"result,omitempty"`
	CreatedAt  time.Time                    `json:"created_at"`
	FinishedAt *time.Time                   `json:"finished_at,omitempty"`
}

var processingJobs sync.Map // map[jobID]asyncJobStatus

var uuidRegex = regexp.MustCompile(`^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-5][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}$`)

func ocrEndpoint() string {
	url := os.Getenv("OCR_SERVICE_URL")
	if url == "" {
		return "http://localhost:8000/ocr"
	}
	return url
}

func llmEndpoint() string {
	url := os.Getenv("LLM_COMPLETION_URL")
	if url == "" {
		return "http://localhost:8081/completion"
	}
	return url
}

func ocrTimeout() time.Duration {
	// Allow tuning timeout for OCR model cold start and larger PDFs.
	seconds := 300
	if raw := os.Getenv("OCR_TIMEOUT_SECONDS"); raw != "" {
		if v, err := strconv.Atoi(raw); err == nil && v > 0 {
			seconds = v
		}
	}
	return time.Duration(seconds) * time.Second
}

func newJobID() (string, error) {
	b := make([]byte, 16)
	if _, err := rand.Read(b); err != nil {
		return "", err
	}
	return hex.EncodeToString(b), nil
}

// ProcessFirst10PagesHandler orchestrates extraction + summarization
// POST /v1/documents/process-first-10-pages
func ProcessFirst10PagesHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	if ApplyCORS(w, r, "POST, OPTIONS") {
		return
	}

	userID, err := AuthenticatedUserIDFromRequest(r)
	if err != nil {
		// For testing: use a test user ID if auth fails
		userID = "test-user-" + fmt.Sprintf("%d", time.Now().Unix())
		log.Printf("No valid auth token, using test userID: %s", userID)
	}

	asyncMode := r.URL.Query().Get("async") == "true"

	// Parse multipart form (max 50MB for large PDFs)
	err = r.ParseMultipartForm(50 << 20)
	if err != nil {
		http.Error(w, fmt.Sprintf("Failed to parse form: %v", err), http.StatusBadRequest)
		return
	}

	// Get file from form
	file, fileHeader, err := r.FormFile("file")
	if err != nil {
		http.Error(w, fmt.Sprintf("Failed to get file: %v", err), http.StatusBadRequest)
		return
	}
	defer file.Close()

	// Read file into memory
	fileBytes, err := io.ReadAll(file)
	if err != nil {
		http.Error(w, fmt.Sprintf("Failed to read file: %v", err), http.StatusInternalServerError)
		return
	}

	// Validate file is PDF
	if len(fileBytes) < 4 || string(fileBytes[0:4]) != "%PDF" {
		http.Error(w, "Invalid PDF file format", http.StatusBadRequest)
		return
	}

	if asyncMode {
		jobID, err := newJobID()
		if err != nil {
			http.Error(w, "Failed to create async job", http.StatusInternalServerError)
			return
		}

		processingJobs.Store(jobID, asyncJobStatus{
			JobID:     jobID,
			Status:    "processing",
			CreatedAt: time.Now(),
		})

		go func() {
			result, runErr := executeFirst10PagesWorkflow(userID, fileHeader.Filename, fileHeader.Size, fileBytes)
			now := time.Now()
			if runErr != nil {
				processingJobs.Store(jobID, asyncJobStatus{
					JobID:      jobID,
					Status:     "failed",
					Error:      runErr.Error(),
					CreatedAt:  now,
					FinishedAt: &now,
				})
				return
			}
			processingJobs.Store(jobID, asyncJobStatus{
				JobID:      jobID,
				Status:     "completed",
				Result:     result,
				CreatedAt:  now,
				FinishedAt: &now,
			})
		}()

		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusAccepted)
		_ = json.NewEncoder(w).Encode(map[string]string{
			"job_id":      jobID,
			"status":      "processing",
			"status_path": "/v1/documents/process-first-10-pages/status?id=" + jobID,
		})
		return
	}

	result, err := executeFirst10PagesWorkflow(userID, fileHeader.Filename, fileHeader.Size, fileBytes)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	_ = json.NewEncoder(w).Encode(result)
}

// ProcessFirst10PagesStatusHandler checks status of async extraction+summary jobs.
func ProcessFirst10PagesStatusHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	if ApplyCORS(w, r, "GET, OPTIONS") {
		return
	}

	jobID := r.URL.Query().Get("id")
	if jobID == "" {
		http.Error(w, "Missing id", http.StatusBadRequest)
		return
	}

	val, ok := processingJobs.Load(jobID)
	if !ok {
		http.Error(w, "Job not found", http.StatusNotFound)
		return
	}

	status := val.(asyncJobStatus)
	w.Header().Set("Content-Type", "application/json")
	_ = json.NewEncoder(w).Encode(status)
}

func executeFirst10PagesWorkflow(userID, filename string, size int64, fileBytes []byte) (*ProcessFirst10PagesResponse, error) {
	startTime := time.Now()

	// Step 1: Extract first 10 pages via OCR service
	log.Printf("[PROCESSING] Starting extraction and summarization for user %s, file: %s", userID, filename)

	extractionStartTime := time.Now()
	extractedText, ocrConfidence, err := extractFirst10Pages(fileBytes)
	if err != nil {
		return nil, fmt.Errorf("OCR extraction failed: %v", err)
	}
	extractionTimeMs := int(time.Since(extractionStartTime).Milliseconds())

	if extractedText == "" {
		return nil, fmt.Errorf("no text extracted from first 10 pages")
	}

	log.Printf("[PROCESSING] Extraction completed. Extracted %d characters with confidence %.2f%%", len(extractedText), ocrConfidence*100)

	// Step 2: Summarize extracted text via LLM service
	summarizationStartTime := time.Now()
	summary, err := summarizeExtractedText(extractedText)
	if err != nil {
		log.Printf("[PROCESSING] Warning: summarization failed: %v. Returning extraction only.", err)
		summary = "" // Set empty summary but don't fail the whole request
	}
	summarizationTimeMs := int(time.Since(summarizationStartTime).Milliseconds())

	log.Printf("[PROCESSING] Summarization completed in %dms", summarizationTimeMs)

	// Step 3: Store result in database
	result := models.DocumentProcessingResult{
		UserID:              userID,
		OriginalFilename:    filename,
		OriginalSizeBytes:   size,
		ExtractedText:       extractedText,
		ExtractedTextLength: len(extractedText),
		OCRConfidence:       ocrConfidence,
		Summary:             summary,
		ExtractionTimeMs:    extractionTimeMs,
		SummarizationTimeMs: summarizationTimeMs,
	}

	resultID := ""
	if uuidRegex.MatchString(userID) {
		resultID, err = models.InsertDocumentProcessingResult(config.DB, result)
		if err != nil {
			log.Printf("[PROCESSING] Warning: Failed to store result in DB: %v", err)
			// Don't fail the request, still return the data
		}
	} else {
		log.Printf("[PROCESSING] Skipping result persistence due to non-UUID user context: %q", userID)
	}

	totalTimeMs := int(time.Since(startTime).Milliseconds())

	// Step 4: Return response
	response := ProcessFirst10PagesResponse{
		ResultID:            resultID,
		ExtractedText:       extractedText,
		ExtractedTextLength: len(extractedText),
		OCRConfidence:       ocrConfidence,
		Summary:             summary,
		ExtractionTimeMs:    extractionTimeMs,
		SummarizationTimeMs: summarizationTimeMs,
		TotalTimeMs:         totalTimeMs,
	}

	log.Printf("[PROCESSING] Completed in %dms. Extracted %d chars, confidence: %.2f", totalTimeMs, len(extractedText), ocrConfidence)
	return &response, nil
}

// extractFirst10Pages calls the PaddleOCR service to extract text from first 10 pages
func extractFirst10Pages(pdfBytes []byte) (string, float64, error) {
	// Create multipart form for file upload to OCR service
	body := &bytes.Buffer{}
	writer := multipart.NewWriter(body)

	// Add file part
	part, err := writer.CreateFormFile("file", "document.pdf")
	if err != nil {
		return "", 0, fmt.Errorf("failed to create form file: %v", err)
	}
	if _, err := part.Write(pdfBytes); err != nil {
		return "", 0, fmt.Errorf("failed to write to form: %v", err)
	}
	writer.Close()

	// Call OCR service
	ocrServiceURL := ocrEndpoint()
	req, err := http.NewRequest("POST", ocrServiceURL, body)
	if err != nil {
		return "", 0, fmt.Errorf("failed to create request: %v", err)
	}
	req.Header.Set("Content-Type", writer.FormDataContentType())

	client := &http.Client{Timeout: ocrTimeout()}
	resp, err := client.Do(req)
	if err != nil {
		return "", 0, fmt.Errorf("failed to call OCR service at %s: %v", ocrServiceURL, err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		respBody, _ := io.ReadAll(resp.Body)
		return "", 0, fmt.Errorf("OCR service error (status %d): %s", resp.StatusCode, string(respBody))
	}

	// Parse OCR response
	var ocrResp map[string]interface{}
	if err := json.NewDecoder(resp.Body).Decode(&ocrResp); err != nil {
		return "", 0, fmt.Errorf("failed to decode OCR response: %v", err)
	}

	extractedText, confidence, pageCount := combineFirst10Pages(ocrResp)

	log.Printf("[OCR] Extracted from %d pages with average confidence %.2f", pageCount, confidence)
	return extractedText, confidence, nil
}

func combineFirst10Pages(ocrResp map[string]interface{}) (string, float64, int) {
	confidence := 0.9 // Default confidence
	pageCount := 0
	texts := []string{}
	confidences := []float64{}

	pages, ok := ocrResp["pages"].([]interface{})
	if !ok {
		return "", confidence, pageCount
	}

	for i, pageData := range pages {
		if i >= 10 {
			break
		}
		pageCount++

		pageMap, ok := pageData.(map[string]interface{})
		if !ok {
			continue
		}
		if errVal, hasErr := pageMap["error"]; hasErr && errVal != nil {
			log.Printf("[OCR] Skipping page %d due to error: %v", i, errVal)
			continue
		}
		if text, ok := pageMap["text"].(string); ok && text != "" {
			texts = append(texts, text)
		}
		if conf, ok := pageMap["avg_confidence"].(float64); ok {
			confidences = append(confidences, conf)
		}
	}

	if len(confidences) > 0 {
		total := 0.0
		for _, c := range confidences {
			total += c
		}
		confidence = total / float64(len(confidences))
	}

	return strings.Join(texts, " "), confidence, pageCount
}

// summarizeExtractedText calls the LLM service to summarize extracted text
func summarizeExtractedText(extractedText string) (string, error) {
	if extractedText == "" {
		return "", fmt.Errorf("empty extracted text")
	}

	llmServiceURL := llmEndpoint()

	// Use completion endpoint directly
	llmPayload := map[string]interface{}{
		"prompt":      fmt.Sprintf("Summarize the following text concisely:\n\n%s\n\nSummary:", extractedText),
		"n_predict":   256,
		"n_ctx":       2048,
		"temperature": 0.3,
	}

	llmBody, err := json.Marshal(llmPayload)
	if err != nil {
		return "", fmt.Errorf("failed to marshal LLM payload: %v", err)
	}

	client := &http.Client{Timeout: 45 * time.Second}
	req, err := http.NewRequest("POST", llmServiceURL, bytes.NewReader(llmBody))
	if err != nil {
		return "", fmt.Errorf("failed to build LLM request: %v", err)
	}
	req.Header.Set("Content-Type", "application/json")

	resp, err := client.Do(req)
	if err != nil {
		return "", fmt.Errorf("failed to call LLM service: %v", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		respBody, _ := io.ReadAll(resp.Body)
		return "", fmt.Errorf("LLM service error: %s", string(respBody))
	}

	// Parse LLM response
	var llmResp map[string]interface{}
	if err := json.NewDecoder(resp.Body).Decode(&llmResp); err != nil {
		return "", fmt.Errorf("failed to decode LLM response: %v", err)
	}

	// Extract summary
	if content, ok := llmResp["content"].(string); ok {
		return content, nil
	}

	return "", fmt.Errorf("no content in LLM response")
}
