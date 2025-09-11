package main

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"log"
	"mime/multipart"
	"net/http"
	"os"
	"time"
)

const maxUploadSize = 20 << 20
const pythonServiceURL = "http://localhost:8000/ocr"

// OCRResult matches the Python OCR service response
type Page struct {
	PageIndex     int     `json:"page_index"`
	Text          string  `json:"text"`
	AvgConfidence float64 `json:"avg_confidence"`
}

type OCRResult struct {
	Pages []Page `json:"pages"`
}

func main() {
	http.HandleFunc("/health", healthHandler)
	http.HandleFunc("/ocr", ocrHandler)

	port := os.Getenv("PORT")
	if port == "" {
		port = "8080"
	}

	log.Printf("Go backend starting on :%s", port)
	if err := http.ListenAndServe(":"+port, nil); err != nil {
		log.Fatalf("server failure: %v", err)
	}
}

func healthHandler(w http.ResponseWriter, r *http.Request) {
	w.WriteHeader(http.StatusOK)
	w.Write([]byte(`{"status":"ok"}`))
}

func ocrHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "only POST allowed", http.StatusMethodNotAllowed)
		return
	}
	// limit size
	r.Body = http.MaxBytesReader(w, r.Body, maxUploadSize)
	if err := r.ParseMultipartForm(maxUploadSize); err != nil {
		http.Error(w, "failed to parse form: "+err.Error(), http.StatusBadRequest)
		return
	}
	file, fileHeader, err := r.FormFile("file") // changed to 'file' for consistency
	if err != nil {
		http.Error(w, "file field required: "+err.Error(), http.StatusBadRequest)
		return
	}
	defer file.Close()
	log.Printf("received file: %s (%d bytes)", fileHeader.Filename, fileHeader.Size)

	var buf bytes.Buffer
	if _, err := io.Copy(&buf, file); err != nil {
		http.Error(w, "failed to read file: "+err.Error(), http.StatusInternalServerError)
		return
	}

	ctx, cancel := context.WithTimeout(r.Context(), 30*time.Second)
	defer cancel()

	res, err := callPythonOCR(ctx, buf.Bytes(), fileHeader.Filename)
	if err != nil {
		log.Printf("python ocr error: %v", err)
		http.Error(w, "ocr service error: "+err.Error(), http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(res)
}

func callPythonOCR(ctx context.Context, imageBytes []byte, filename string) (*OCRResult, error) {
	var b bytes.Buffer
	w := multipart.NewWriter(&b)
	fw, err := w.CreateFormFile("file", filename) // changed to 'file' for consistency
	if err != nil {
		return nil, err
	}
	if _, err := fw.Write(imageBytes); err != nil {
		return nil, err
	}
	w.Close()

	req, err := http.NewRequestWithContext(ctx, "POST", pythonServiceURL, &b)
	if err != nil {
		return nil, err
	}
	req.Header.Set("Content-Type", w.FormDataContentType())

	client := &http.Client{
		Timeout: 40 * time.Second,
	}
	httpRes, err := client.Do(req)
	if err != nil {
		return nil, err
	}
	defer httpRes.Body.Close()

	if httpRes.StatusCode != http.StatusOK {
		body, _ := io.ReadAll(httpRes.Body)
		return nil, fmt.Errorf("python service returned %d: %s", httpRes.StatusCode, string(body))
	}

	var ocrRes OCRResult
	if err := json.NewDecoder(httpRes.Body).Decode(&ocrRes); err != nil {
		return nil, err
	}
	return &ocrRes, nil
}
