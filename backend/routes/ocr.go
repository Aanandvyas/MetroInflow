package routes

import (
	"encoding/json"
	"io"
	"net/http"
	"os"

	"backend/handlers"
)

// OCRHandler handles /ocr endpoint
func OCRHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "only POST allowed", http.StatusMethodNotAllowed)
		return
	}

	// Limit request size (50 MB)
	r.Body = http.MaxBytesReader(w, r.Body, 50<<20)

	file, header, err := r.FormFile("file")
	if err != nil {
		http.Error(w, "file required: "+err.Error(), http.StatusBadRequest)
		return
	}
	defer file.Close()

	content, err := io.ReadAll(file)
	if err != nil {
		http.Error(w, "failed to read file: "+err.Error(), http.StatusInternalServerError)
		return
	}

	pythonOCRURL := os.Getenv("PYTHON_OCR_URL")
	if pythonOCRURL == "" {
		pythonOCRURL = "http://localhost:8000/ocr"
	}

	ocrResp, err := handlers.RunOCR(header.Filename, content, pythonOCRURL)
	if err != nil {
		http.Error(w, "ocr service error: "+err.Error(), http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(ocrResp)
}
