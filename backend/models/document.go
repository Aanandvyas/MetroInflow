package models

import (
	"time"
)

type Document struct {
	ID                 string    `json:"id"`
	FileName           string    `json:"file_name"`
	Status             string    `json:"status"`
	OCRText            string    `json:"ocr_text,omitempty"`
	SummaryText        string    `json:"summary_text,omitempty"`
	ErrorMessage       string    `json:"error_message,omitempty"`
	CreatedAt          time.Time `json:"created_at"`
	UpdatedAt          time.Time `json:"updated_at"`
	OCRCompletedAt     time.Time `json:"ocr_completed_at,omitempty"`
	SummaryCompletedAt time.Time `json:"summary_completed_at,omitempty"`
}

// DB methods (pseudo)
func InsertDocument(fileName string) (*Document, error) {
	// TODO: Implement insert logic
	return &Document{ID: "stub", FileName: fileName, Status: "uploaded", CreatedAt: time.Now(), UpdatedAt: time.Now()}, nil
}

func GetNextUploaded() (*Document, error) {
	// TODO: Implement DB logic
	return nil, nil
}

func GetNextOCRDone() (*Document, error) {
	// TODO: Implement DB logic
	return nil, nil
}

func UpdateStatus(id, status string, fields map[string]interface{}) error {
	// TODO: Implement update logic
	return nil
}

// GetDocumentByID fetches single document by id
func GetDocumentByID(id string) (*Document, error) {
	// TODO: Implement DB logic
	return &Document{ID: id, FileName: "stub.pdf", Status: "uploaded", CreatedAt: time.Now(), UpdatedAt: time.Now()}, nil
}

// ListDocuments fetches documents optionally filtered by status
func ListDocuments(status string, limit int) ([]Document, error) {
	// TODO: Implement DB logic
	return []Document{}, nil
}
