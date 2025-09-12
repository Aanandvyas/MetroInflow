package config

import (
	"backend/models"
	"backend/services"
	"encoding/json"
	"net/http"
	"time"
)

// InitConfig stub for main.go
func InitConfig() {
	// TODO: Load environment variables, etc.
}

// POST /v1/documents/{id}/process
func ProcessDocumentHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	id := r.URL.Path[len("/v1/documents/"):]
	id = id[:len(id)-len("/process")] // remove trailing /process

	doc, err := models.GetDocumentByID(id)
	if err != nil {
		http.Error(w, "Document not found", http.StatusNotFound)
		return
	}

	// 1️⃣ Run OCR if not done
	if doc.Status == "uploaded" || doc.Status == "error" {
		text, err := services.RunOCR(doc.FileName)
		if err != nil {
			models.UpdateStatus(doc.ID, "error", map[string]interface{}{"error_message": err.Error()})
			http.Error(w, "OCR failed", http.StatusInternalServerError)
			return
		}
		models.UpdateStatus(doc.ID, "ocr_done", map[string]interface{}{
			"ocr_text":         text,
			"ocr_completed_at": time.Now(),
		})
		doc.OCRText = text
		doc.Status = "ocr_done"
	}

	// 2️⃣ Run summarizer if not done
	if doc.Status == "ocr_done" {
		summary, err := services.CallHFSummarizerWithChunking(doc.OCRText)
		if err != nil {
			models.UpdateStatus(doc.ID, "error", map[string]interface{}{"error_message": err.Error()})
			http.Error(w, "Summarizer failed", http.StatusInternalServerError)
			return
		}
		models.UpdateStatus(doc.ID, "summary_done", map[string]interface{}{
			"summary_text":         summary,
			"summary_completed_at": time.Now(),
		})
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]string{
		"message": "Document processed successfully",
		"doc_id":  doc.ID,
	})
}
