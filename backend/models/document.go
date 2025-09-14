// ...existing code...
package models

import (
	"context"
	"database/sql"
	"log"
)

type Summary struct {
	SUUID     string `json:"s_uuid"`
	FUUID     string `json:"f_uuid"`
	Summary   string `json:"summary"`
	CreatedAt string `json:"created_at,omitempty"`
}

func InsertSummary(db *sql.DB, summary Summary) error {
	query := `
			INSERT INTO summary (f_uuid, summary, created_at)
			VALUES ($1, $2, NOW())
		`
	_, err := db.Exec(query, summary.FUUID, summary.Summary)
	if err != nil {
		log.Println("InsertSummary DB error:", err)
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
	rows, err := db.QueryContext(context.Background(), "SELECT f_uuid, f_name, language, file_path, d_uuid, status, uploaded_at FROM file")
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var files []Document
	for rows.Next() {
		var doc Document
		err := rows.Scan(&doc.FUUID, &doc.FileName, &doc.Language, &doc.FilePath, &doc.DUUID, &doc.Status, &doc.UploadedAt)
		if err != nil {
			return nil, err
		}
		files = append(files, doc)
	}
	return files, nil
}

func GetFileByUUID(db *sql.DB, fuuid string) (*Document, error) {
	query := "SELECT f_uuid, f_name, language, file_path, d_uuid, status, uploaded_at FROM file WHERE f_uuid = $1"
	row := db.QueryRowContext(context.Background(), query, fuuid)
	var doc Document
	err := row.Scan(&doc.FUUID, &doc.FileName, &doc.Language, &doc.FilePath, &doc.DUUID, &doc.Status, &doc.UploadedAt)
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
