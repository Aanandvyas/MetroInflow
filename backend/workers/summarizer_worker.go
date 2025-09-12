package workers

import (
	"backend/models"
	"backend/services"
	"log"
	"time"
)

func SummarizerWorker() {
	for {
		doc, err := models.GetNextOCRDone()
		if err != nil || doc == nil {
			log.Println("No OCR-done docs, sleeping...")
			time.Sleep(5 * time.Second)
			continue
		}

		summary, err := services.CallHFSummarizer(doc.OCRText)
		if err != nil {
			models.UpdateStatus(doc.ID, "error", map[string]interface{}{"error_message": err.Error()})
			continue
		}

		models.UpdateStatus(doc.ID, "summary_done", map[string]interface{}{"summary_text": summary, "summary_completed_at": time.Now()})
	}
}
