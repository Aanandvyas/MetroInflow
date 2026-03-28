package handlers

import (
	"database/sql"
	"encoding/json"
	"fmt"
	"net/http"
	"time"

	"backend/config"
	"backend/models"
)

// RequestSummaryRequest is the request payload for summary generation.
type RequestSummaryRequest struct {
	DocumentID string `json:"document_id"`
	FUUID      string `json:"f_uuid,omitempty"`
}

// RequestSummaryResponse is the response after initiating summary generation.
type RequestSummaryResponse struct {
	Status  string `json:"status"`
	Message string `json:"message"`
	FUUID   string `json:"f_uuid"`
}

// SummaryStatusResponse is the response for checking summary status.
type SummaryStatusResponse struct {
	Status    string `json:"status"`
	Summary   string `json:"summary,omitempty"`
	Error     string `json:"error,omitempty"`
	Message   string `json:"message"`
	FUUID     string `json:"f_uuid"`
	UpdatedAt string `json:"updated_at"`
}

// RequestSummaryHandler queues summary generation for a document.
func RequestSummaryHandler(w http.ResponseWriter, r *http.Request) {
	var req RequestSummaryRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Invalid request body", http.StatusBadRequest)
		return
	}

	fuuid := req.DocumentID
	if fuuid == "" {
		fuuid = req.FUUID
	}
	if fuuid == "" {
		http.Error(w, "document_id is required", http.StatusBadRequest)
		return
	}

	if config.DB == nil {
		http.Error(w, "Database connection failed", http.StatusInternalServerError)
		return
	}

	if _, err := models.GetFileByUUID(config.DB, fuuid); err != nil {
		http.Error(w, "Document not found", http.StatusNotFound)
		return
	}

	state, _, _, _, err := latestSummaryByFileUUID(config.DB, fuuid)
	if err != nil {
		http.Error(w, "Failed to inspect existing summary", http.StatusInternalServerError)
		return
	}
	if state == "pending" || state == "processing" {
		w.Header().Set("Content-Type", "application/json")
		_ = json.NewEncoder(w).Encode(RequestSummaryResponse{
			Status:  "already_processing",
			Message: "Summary generation already initiated for this document",
			FUUID:   fuuid,
		})
		return
	}

	if err := models.InsertSummary(config.DB, models.Summary{FUUID: fuuid, Summary: ""}); err != nil {
		http.Error(w, "Failed to queue summary generation", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusAccepted)
	_ = json.NewEncoder(w).Encode(RequestSummaryResponse{
		Status:  "queued",
		Message: "Summary generation queued",
		FUUID:   fuuid,
	})
}

// GetSummaryStatusHandler checks the status of a summary generation request.
func GetSummaryStatusHandler(w http.ResponseWriter, r *http.Request) {
	documentID := r.URL.Query().Get("document_id")
	if documentID == "" {
		documentID = r.URL.Query().Get("f_uuid")
	}
	if documentID == "" {
		http.Error(w, "document_id query parameter is required", http.StatusBadRequest)
		return
	}

	if config.DB == nil {
		http.Error(w, "Database connection failed", http.StatusInternalServerError)
		return
	}

	if _, err := models.GetFileByUUID(config.DB, documentID); err != nil {
		http.Error(w, "Document not found", http.StatusNotFound)
		return
	}

	state, summary, errMsg, updatedAt, err := latestSummaryByFileUUID(config.DB, documentID)
	if err != nil {
		http.Error(w, "Failed to fetch summary status", http.StatusInternalServerError)
		return
	}

	if state == "" {
		w.Header().Set("Content-Type", "application/json")
		_ = json.NewEncoder(w).Encode(SummaryStatusResponse{
			Status:    "not_requested",
			Message:   "Summary has not been requested for this document",
			FUUID:     documentID,
			UpdatedAt: time.Now().UTC().Format(time.RFC3339),
		})
		return
	}

	resp := SummaryStatusResponse{
		Status:    state,
		Summary:   summary,
		Message:   "Status retrieved",
		FUUID:     documentID,
		UpdatedAt: updatedAt,
	}
	if state == "failed" {
		resp.Error = errMsg
	}

	w.Header().Set("Content-Type", "application/json")
	_ = json.NewEncoder(w).Encode(resp)
}

func latestSummaryByFileUUID(db *sql.DB, fuuid string) (state, summary, errMsg, updatedAt string, err error) {
	const query = `
		SELECT state, COALESCE(summary, ''), COALESCE(error_message, ''), updated_at
		FROM summary
		WHERE f_uuid = $1
		ORDER BY created_at DESC
		LIMIT 1
	`

	var updated time.Time
	if scanErr := db.QueryRow(query, fuuid).Scan(&state, &summary, &errMsg, &updated); scanErr != nil {
		if scanErr == sql.ErrNoRows {
			return "", "", "", "", nil
		}
		return "", "", "", "", fmt.Errorf("failed querying summary status: %w", scanErr)
	}

	return state, summary, errMsg, updated.UTC().Format(time.RFC3339), nil
}
