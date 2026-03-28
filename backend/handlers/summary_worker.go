package handlers

import (
	"fmt"
	"log"
	"os"
	"path/filepath"

	"backend/config"
	"backend/models"
)

// ProcessSummaryWorkerTask fetches a pending summary from DB, processes it, and updates DB
func ProcessSummaryWorkerTask() {
	for {
		summaryRow, err := models.GetPendingSummary(config.DB)
		if err != nil {
			log.Printf("[WORKER] Error fetching pending summary: %v", err)
			return
		}

		if summaryRow == nil {
			log.Println("[WORKER] No status=false summary rows to process")
			return
		}

		processOneSummary(summaryRow)
	}
}

func processOneSummary(summaryRow *models.Summary) {
	log.Printf("[WORKER] Found pending summary: s_uuid=%s, f_uuid=%s", summaryRow.SUUID, summaryRow.FUUID)

	if err := models.MarkSummaryInProgress(config.DB, summaryRow.SUUID); err != nil {
		log.Printf("[WORKER] Failed to mark in progress: %v", err)
		return
	}
	_ = models.UpdateSummaryState(config.DB, summaryRow.SUUID, "downloading_file")

	docFile, err := models.GetFileByUUID(config.DB, summaryRow.FUUID)
	if err != nil {
		log.Printf("[WORKER] Failed to fetch file metadata: %v", err)
		models.MarkSummaryFailed(config.DB, summaryRow.SUUID, fmt.Sprintf("File not found: %v", err), summaryRow.RetryCount)
		return
	}

	if docFile == nil {
		log.Printf("[WORKER] File not found for f_uuid=%s", summaryRow.FUUID)
		models.MarkSummaryFailed(config.DB, summaryRow.SUUID, "File not found in database", summaryRow.RetryCount)
		return
	}

	tmpPath := filepath.Join(os.TempDir(), filepath.Base(docFile.FilePath))
	err = config.Supabase.DownloadFile("file_storage", docFile.FilePath, tmpPath)
	if err != nil {
		log.Printf("[WORKER] Failed to download file from storage: %v", err)
		models.MarkSummaryFailed(config.DB, summaryRow.SUUID, fmt.Sprintf("Failed to download file: %v", err), summaryRow.RetryCount)
		return
	}
	defer func() { _ = os.Remove(tmpPath) }()
	_ = models.UpdateSummaryState(config.DB, summaryRow.SUUID, "validating_file")

	fileBytes, err := os.ReadFile(tmpPath)
	if err != nil {
		log.Printf("[WORKER] Failed to read file from disk: %v", err)
		models.MarkSummaryFailed(config.DB, summaryRow.SUUID, fmt.Sprintf("Failed to read file: %v", err), summaryRow.RetryCount)
		return
	}

	if len(fileBytes) < 4 || string(fileBytes[0:4]) != "%PDF" {
		log.Printf("[WORKER] Invalid PDF format for f_uuid=%s", summaryRow.FUUID)
		models.MarkSummaryFailed(config.DB, summaryRow.SUUID, "Invalid PDF file format", summaryRow.RetryCount)
		return
	}

	_ = models.UpdateSummaryState(config.DB, summaryRow.SUUID, "processing_content")
	log.Printf("[WORKER] Starting OCR+summarization for %s", docFile.FileName)
	result, err := executeFirst10PagesWorkflow(docFile.UUID, docFile.FileName, int64(len(fileBytes)), fileBytes)
	if err != nil {
		log.Printf("[WORKER] Workflow failed: %v", err)
		newRetryCount := summaryRow.RetryCount + 1
		models.MarkSummaryFailed(config.DB, summaryRow.SUUID, fmt.Sprintf("Processing failed: %v", err), newRetryCount)
		return
	}

	_ = models.UpdateSummaryState(config.DB, summaryRow.SUUID, "saving_result")
	summaryUpdate := models.Summary{
		SUUID:               summaryRow.SUUID,
		Summary:             result.Summary,
		OCRConfidence:       result.OCRConfidence,
		ExtractedTextLength: result.ExtractedTextLength,
		ExtractionTimeMs:    result.ExtractionTimeMs,
		SummarizationTimeMs: result.SummarizationTimeMs,
		TotalTimeMs:         result.TotalTimeMs,
		ErrorMessage:        "",
	}

	if err := models.UpdateSummaryResult(config.DB, summaryRow.SUUID, summaryUpdate); err != nil {
		log.Printf("[WORKER] Failed to update summary result: %v", err)
		models.MarkSummaryFailed(config.DB, summaryRow.SUUID, fmt.Sprintf("Failed to update result: %v", err), summaryRow.RetryCount)
		return
	}

	log.Printf("[WORKER] Successfully processed summary s_uuid=%s. Summary length: %d chars", summaryRow.SUUID, len(result.Summary))
}
