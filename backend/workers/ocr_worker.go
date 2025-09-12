package workers

import (
	"backend/models"
	"backend/services"
	"log"
	"time"
)

func OCRWorker() {
	for {
		doc, err := models.GetNextUploaded()
		if err != nil || doc == nil {
			log.Println("No uploaded docs, sleeping...")
			time.Sleep(5 * time.Second)
			continue
		}

		text, err := services.RunOCR(doc.FileName)
		if err != nil {
			models.UpdateStatus(doc.ID, "error", map[string]interface{}{"error_message": err.Error()})
			continue
		}

		models.UpdateStatus(doc.ID, "ocr_done", map[string]interface{}{"ocr_text": text, "ocr_completed_at": time.Now()})
	}
}
