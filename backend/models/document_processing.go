package models

import (
	"database/sql"
	"log"
)

// DocumentProcessingResult represents the result of extracting and summarizing first 10 pages
type DocumentProcessingResult struct {
	ResultID            string  `json:"result_id"`
	UserID              string  `json:"user_id"`
	OriginalFilename    string  `json:"original_filename"`
	OriginalSizeBytes   int64   `json:"original_size_bytes"`
	ExtractedText       string  `json:"extracted_text"`
	ExtractedTextLength int     `json:"extracted_text_length"`
	OCRConfidence       float64 `json:"ocr_confidence"`
	Summary             string  `json:"summary"`
	ExtractionTimeMs    int     `json:"extraction_time_ms"`
	SummarizationTimeMs int     `json:"summarization_time_ms"`
	CreatedAt           string  `json:"created_at,omitempty"`
	UpdatedAt           string  `json:"updated_at,omitempty"`
}

// InsertDocumentProcessingResult stores the extraction + summarization result
func InsertDocumentProcessingResult(db *sql.DB, result DocumentProcessingResult) (string, error) {
	query := `
		INSERT INTO document_processing_results (
			user_id, original_filename, original_size_bytes, 
			extracted_text, extracted_text_length, ocr_confidence,
			summary, extraction_time_ms, summarization_time_ms
		)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
		RETURNING result_id
	`
	var resultID string
	err := db.QueryRow(
		query,
		result.UserID,
		result.OriginalFilename,
		result.OriginalSizeBytes,
		result.ExtractedText,
		result.ExtractedTextLength,
		result.OCRConfidence,
		result.Summary,
		result.ExtractionTimeMs,
		result.SummarizationTimeMs,
	).Scan(&resultID)

	if err != nil {
		log.Println("[DB] InsertDocumentProcessingResult error:", err)
	}
	return resultID, err
}

// GetDocumentProcessingResult retrieves a processing result by ID
func GetDocumentProcessingResult(db *sql.DB, resultID string) (*DocumentProcessingResult, error) {
	result := &DocumentProcessingResult{}
	query := `
		SELECT result_id, user_id, original_filename, original_size_bytes,
		       extracted_text, extracted_text_length, ocr_confidence,
		       summary, extraction_time_ms, summarization_time_ms,
		       created_at, updated_at
		FROM document_processing_results
		WHERE result_id = $1
	`
	err := db.QueryRow(query, resultID).Scan(
		&result.ResultID,
		&result.UserID,
		&result.OriginalFilename,
		&result.OriginalSizeBytes,
		&result.ExtractedText,
		&result.ExtractedTextLength,
		&result.OCRConfidence,
		&result.Summary,
		&result.ExtractionTimeMs,
		&result.SummarizationTimeMs,
		&result.CreatedAt,
		&result.UpdatedAt,
	)
	if err != nil {
		log.Println("[DB] GetDocumentProcessingResult error:", err)
	}
	return result, err
}

// GetUserDocumentResults retrieves all processing results for a user
func GetUserDocumentResults(db *sql.DB, userID string, limit int) ([]DocumentProcessingResult, error) {
	query := `
		SELECT result_id, user_id, original_filename, original_size_bytes,
		       extracted_text, extracted_text_length, ocr_confidence,
		       summary, extraction_time_ms, summarization_time_ms,
		       created_at, updated_at
		FROM document_processing_results
		WHERE user_id = $1
		ORDER BY created_at DESC
		LIMIT $2
	`
	rows, err := db.Query(query, userID, limit)
	if err != nil {
		log.Println("[DB] GetUserDocumentResults error:", err)
		return nil, err
	}
	defer rows.Close()

	var results []DocumentProcessingResult
	for rows.Next() {
		var result DocumentProcessingResult
		err := rows.Scan(
			&result.ResultID,
			&result.UserID,
			&result.OriginalFilename,
			&result.OriginalSizeBytes,
			&result.ExtractedText,
			&result.ExtractedTextLength,
			&result.OCRConfidence,
			&result.Summary,
			&result.ExtractionTimeMs,
			&result.SummarizationTimeMs,
			&result.CreatedAt,
			&result.UpdatedAt,
		)
		if err != nil {
			log.Println("[DB] Scan error in GetUserDocumentResults:", err)
			continue
		}
		results = append(results, result)
	}
	return results, nil
}
