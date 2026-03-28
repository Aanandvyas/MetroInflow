// there are many utils fns here
// make the god damm changes
package models

import (
	"context"
	"database/sql"
	"log"
)

type Notification struct {
	NotifID   string `json:"notif_id"`
	UUID      string `json:"uuid"`
	FUUID     string `json:"f_uuid"`
	IsSeen    bool   `json:"is_seen"`
	CreatedAt string `json:"created_at,omitempty"`
}

func InsertNotification(db *sql.DB, notif Notification) error {
	query := `
			INSERT INTO notifications (uuid, f_uuid, is_seen, created_at)
			VALUES ($1, $2, $3, NOW())
		`
	_, err := db.Exec(query, notif.UUID, notif.FUUID, notif.IsSeen)
	if err != nil {
		log.Println("InsertNotification DB error:", err)
	}
	return err
}

type Summary struct {
	SUUID               string  `json:"s_uuid"`
	FUUID               string  `json:"f_uuid"`
	Summary             string  `json:"summary"`
	OCRConfidence       float64 `json:"ocr_confidence,omitempty"`
	ExtractedTextLength int     `json:"extracted_text_length,omitempty"`
	ExtractionTimeMs    int     `json:"extraction_time_ms,omitempty"`
	SummarizationTimeMs int     `json:"summarization_time_ms,omitempty"`
	TotalTimeMs         int     `json:"total_time_ms,omitempty"`
	Status              bool    `json:"status"`
	State               string  `json:"state"`
	ErrorMessage        string  `json:"error_message,omitempty"`
	RetryCount          int     `json:"retry_count"`
	CreatedAt           string  `json:"created_at,omitempty"`
	UpdatedAt           string  `json:"updated_at,omitempty"`
}

// InsertSummary creates a new summary request that has not started yet.
func InsertSummary(db *sql.DB, summary Summary) error {
	query := `
		INSERT INTO summary (f_uuid, summary, status, state, created_at, updated_at)
		VALUES ($1, $2, false, 'pending', NOW(), NOW())
		`
	_, err := db.Exec(query, summary.FUUID, summary.Summary)
	if err != nil {
		log.Println("InsertSummary DB error:", err)
	}
	return err
}

// GetPendingSummary fetches one summary row that has not started yet.
func GetPendingSummary(db *sql.DB) (*Summary, error) {
	query := `
		SELECT s_uuid, f_uuid, summary, status, state, retry_count, created_at, updated_at
		FROM summary
		WHERE status = false
		ORDER BY created_at ASC
		LIMIT 1
	`
	row := db.QueryRowContext(context.Background(), query)
	summary := &Summary{}
	err := row.Scan(
		&summary.SUUID, &summary.FUUID, &summary.Summary,
		&summary.Status, &summary.State, &summary.RetryCount,
		&summary.CreatedAt, &summary.UpdatedAt,
	)
	if err != nil {
		if err == sql.ErrNoRows {
			return nil, nil
		}
		log.Println("[DB] GetPendingSummary error:", err)
		return nil, err
	}
	return summary, nil
}

// MarkSummaryInProgress marks that workflow has started for this row.
func MarkSummaryInProgress(db *sql.DB, suuid string) error {
	query := `
		UPDATE summary
		SET status = true, state = 'processing', updated_at = NOW()
		WHERE s_uuid = $1
	`
	_, err := db.Exec(query, suuid)
	if err != nil {
		log.Println("[DB] MarkSummaryInProgress error:", err)
	}
	return err
}

// UpdateSummaryState tracks current worker progress.
func UpdateSummaryState(db *sql.DB, suuid string, state string) error {
	query := `
		UPDATE summary
		SET state = $1, updated_at = NOW()
		WHERE s_uuid = $2
	`
	_, err := db.Exec(query, state, suuid)
	if err != nil {
		log.Println("[DB] UpdateSummaryState error:", err)
	}
	return err
}

// UpdateSummaryResult stores final summary and marks completion.
func UpdateSummaryResult(db *sql.DB, suuid string, summary Summary) error {
	query := `
		UPDATE summary
		SET summary = $1,
		    ocr_confidence = $2,
		    extracted_text_length = $3,
		    extraction_time_ms = $4,
		    summarization_time_ms = $5,
		    total_time_ms = $6,
		    status = true,
		    state = 'completed',
		    error_message = $7,
		    updated_at = NOW()
		WHERE s_uuid = $8
	`
	_, err := db.Exec(query,
		summary.Summary,
		summary.OCRConfidence,
		summary.ExtractedTextLength,
		summary.ExtractionTimeMs,
		summary.SummarizationTimeMs,
		summary.TotalTimeMs,
		summary.ErrorMessage,
		suuid,
	)
	if err != nil {
		log.Println("[DB] UpdateSummaryResult error:", err)
	}
	return err
}

// MarkSummaryFailed marks summary as failed with error details.
func MarkSummaryFailed(db *sql.DB, suuid string, errMsg string, retryCount int) error {
	query := `
		UPDATE summary
		SET status = true, state = 'failed', error_message = $1, retry_count = $2, updated_at = NOW()
		WHERE s_uuid = $3
	`
	_, err := db.Exec(query, errMsg, retryCount, suuid)
	if err != nil {
		log.Println("[DB] MarkSummaryFailed error:", err)
	}
	return err
}

type Department struct {
	DUUID string `json:"d_uuid"`
	DName string `json:"d_name"`
}

// Fetch all departments from DB
func GetAllDepartments(db *sql.DB) ([]Department, error) {
	rows, err := db.QueryContext(context.Background(), "SELECT d_uuid, d_name FROM department")
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var depts []Department
	for rows.Next() {
		var dept Department
		err := rows.Scan(&dept.DUUID, &dept.DName)
		if err != nil {
			return nil, err
		}
		depts = append(depts, dept)
	}
	return depts, nil
}

type Document struct {
	FUUID      string `json:"f_uuid"`
	FileName   string `json:"f_name"`
	Language   string `json:"language"`
	UUID       string `json:"uuid"`
	FilePath   string `json:"file_path"`
	DUUID      string `json:"d_uuid"`
	Status     string `json:"status"`
	CreatedAt  string `json:"created_at,omitempty"`
	UploadedAt string `json:"uploaded_at,omitempty"`
}

func InsertDocument(db *sql.DB, doc Document) (string, error) {
	query := `
        INSERT INTO file (f_name, language, file_path, d_uuid, status, created_at, uploaded_at)
        VALUES ($1, $2, $3, $4, $5, NOW(), NOW())
        RETURNING f_uuid
    `
	var fuuid string
	err := db.QueryRow(query, doc.FileName, doc.Language, doc.FilePath, doc.DUUID, doc.Status).Scan(&fuuid)
	if err != nil {
		log.Printf("InsertDocument DB error: %+v\n", err)
		return "", err
	}
	return fuuid, nil
}

func InsertFileDepartment(db *sql.DB, f_uuid, d_uuid string) error {
	query := `
        INSERT INTO file_department (f_uuid, d_uuid, created_at)
        VALUES ($1, $2, NOW())
    `
	_, err := db.Exec(query, f_uuid, d_uuid)
	return err
}

func GetAllFiles(db *sql.DB) ([]Document, error) {
	rows, err := db.QueryContext(context.Background(), "SELECT f_uuid, f_name, language, COALESCE(uuid::text, ''), file_path, COALESCE(d_uuid::text, ''), COALESCE(status, ''), COALESCE(uploaded_at::text, '') FROM file")
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var files []Document
	for rows.Next() {
		var doc Document
		err := rows.Scan(&doc.FUUID, &doc.FileName, &doc.Language, &doc.UUID, &doc.FilePath, &doc.DUUID, &doc.Status, &doc.UploadedAt)
		if err != nil {
			return nil, err
		}
		files = append(files, doc)
	}
	return files, nil
}

func GetFileByUUID(db *sql.DB, fuuid string) (*Document, error) {
	query := "SELECT f_uuid, f_name, language, COALESCE(uuid::text, ''), file_path, COALESCE(d_uuid::text, ''), COALESCE(status, ''), COALESCE(uploaded_at::text, '') FROM file WHERE f_uuid = $1"
	row := db.QueryRowContext(context.Background(), query, fuuid)
	var doc Document
	err := row.Scan(&doc.FUUID, &doc.FileName, &doc.Language, &doc.UUID, &doc.FilePath, &doc.DUUID, &doc.Status, &doc.UploadedAt)
	if err != nil {
		return nil, err
	}
	return &doc, nil
}

type OCRResult struct {
	OCRUUID       string  `json:"ocr_uuid"`
	FUUID         string  `json:"f_uuid"`
	Data          string  `json:"data"`
	AvgConfidence float64 `json:"avg_confidence"`
	CreatedAt     string  `json:"created_at,omitempty"`
}

func InsertOCRResult(db *sql.DB, result OCRResult) error {
	query := `
        INSERT INTO ocr (f_uuid, data, avg_confidence, created_at)
        VALUES ($1, $2, $3, NOW())
    `
	_, err := db.Exec(query, result.FUUID, result.Data, result.AvgConfidence)
	if err != nil {
		log.Println("InsertOCRResult DB error:", err)
	}
	return err
}
