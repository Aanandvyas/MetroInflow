package handlers

import (
	"bytes"
	"encoding/json"
	"io"
	"log"
	"net/http"
	"os"

	//used for windows
	// "path"
	//used for linux
	"path/filepath"
	"time"

	"backend/config"
	"backend/models"
	"backend/services"
	"backend/utils"
)

// UploadDocumentsHandler handles multiple file uploads
func UploadDocumentsHandler(w http.ResponseWriter, r *http.Request) {

	//below is the size 50mb
	err := r.ParseMultipartForm(50 << 20)
	if err != nil {
		http.Error(w, "Failed to parse form", http.StatusBadRequest)
		return
	}

	files := r.MultipartForm.File["files"]
	if len(files) == 0 {
		http.Error(w, "No files uploaded", http.StatusBadRequest)
		return
	}

	// Accept multiple department UUIDs as comma-separated string
	d_uuids_raw := r.FormValue("d_uuids")
	if d_uuids_raw == "" {
		http.Error(w, "Missing department UUIDs", http.StatusBadRequest)
		return
	}
	d_uuids := []string{}
	for _, val := range bytes.Split([]byte(d_uuids_raw), []byte{','}) {
		d_uuids = append(d_uuids, string(bytes.TrimSpace(val)))
	}
	if len(d_uuids) == 0 {
		http.Error(w, "No valid department UUIDs provided", http.StatusBadRequest)
		return
	}
	// Validate all department UUIDs exist in DB and map to names
	departments, err := models.GetAllDepartments(config.DB)
	if err != nil {
		http.Error(w, "Failed to fetch departments", http.StatusInternalServerError)
		return
	}
	deptMap := make(map[string]string) // d_uuid -> d_name
	for _, dept := range departments {
		deptMap[dept.DUUID] = dept.DName
	}
	validDeptNames := []string{}
	for _, d_uuid := range d_uuids {
		if name, ok := deptMap[d_uuid]; ok {
			validDeptNames = append(validDeptNames, name)
		} else {
			http.Error(w, "Invalid department UUID: "+d_uuid, http.StatusBadRequest)
			return
		}
	}

	var uploaded []models.Document
	for _, f := range files {
		file, err := f.Open()
		if err != nil {
			log.Println("Error opening file:", err)
			continue
		}
		defer file.Close()

		buf := new(bytes.Buffer)
		_, err = io.Copy(buf, file)
		if err != nil {
			log.Println("Error reading file to buffer:", err)
			continue
		}

		// Use first department for storage path (for organization)
		storagePath := filepath.Join(validDeptNames[0], time.Now().Format("20060102150405")+"_"+f.Filename)
		log.Printf("[DEBUG] Uploading file %s, size: %d bytes", f.Filename, buf.Len())
		if err := config.Supabase.UploadFile("file_storage", storagePath, buf); err != nil {
			log.Printf("Upload error for %s: %+v\n", f.Filename, err)
			continue
		}

		title := r.FormValue("title")
		language := r.FormValue("language")

		doc := models.Document{
			FileName: title, // use title if provided, else f.Filename
			Language: language,
			FilePath: storagePath,
			DUUID:    d_uuids_raw, // store all department UUIDs (optional, for reference)
			Status:   "uploaded",
		}

		fuuid, err := models.InsertDocument(config.DB, doc)
		if err != nil {
			log.Printf("InsertDocument error for %s: %+v\n", doc.FileName, err)
			continue
		}
		doc.FUUID = fuuid

		// Insert into file_department for each department
		for _, d_uuid := range d_uuids {
			_ = models.InsertFileDepartment(config.DB, fuuid, d_uuid)
		}

		uploaded = append(uploaded, doc)

		// Asynchronous OCR, summary, and notification trigger
		go func(filePath, fuuid string) {
			log.Println("[DEBUG] Triggering OCR for:", filePath)
			tmpPath := filepath.Join(os.TempDir(), filepath.Base(filePath))
			err := config.Supabase.DownloadFile("file_storage", filePath, tmpPath)
			if err != nil {
				log.Println("[DEBUG] Download error:", err)
				return
			}
			defer func() { _ = os.Remove(tmpPath) }()
			ocrText, avgConf, err := services.RunOCR(tmpPath)
			if err != nil {
				log.Println("[DEBUG] OCR error:", err)
				return
			}
			log.Println("[DEBUG] OCR extracted text:", ocrText)
			log.Println("[DEBUG] OCR avg confidence:", avgConf)
			ocrResult := models.OCRResult{
				FUUID:         fuuid,
				Data:          ocrText,
				AvgConfidence: avgConf,
			}
			if err := models.InsertOCRResult(config.DB, ocrResult); err != nil {
				log.Println("[DEBUG] Failed to insert OCR result:", err)
			}

			log.Println("[DEBUG] Triggering summary for:", fuuid)
			summaryText, err := services.RunSummarizer(ocrText)
			if err != nil {
				log.Println("[DEBUG] Summary error:", err)
				return
			}
			log.Println("[DEBUG] Summary generated:", summaryText)
			summary := models.Summary{
				FUUID:   fuuid,
				Summary: summaryText,
			}
			if err := models.InsertSummary(config.DB, summary); err != nil {
				log.Println("[DEBUG] Failed to insert summary:", err)
			}

			notif := models.Notification{
				UUID:   doc.UUID,
				FUUID:  fuuid,
				IsSeen: false,
			}
			if err := models.InsertNotification(config.DB, notif); err != nil {
				log.Println("[DEBUG] Failed to insert notification:", err)
			} else {
				userEmail := ""
				fileName := doc.FileName
				row := config.DB.QueryRow("SELECT email FROM users WHERE uuid = $1", doc.UUID)
				_ = row.Scan(&userEmail)
				if userEmail != "" {
					subject := "New file uploaded: " + fileName
					body := "A new file has been added to your account.\n\nFile: " + fileName + "\nDepartments: " + d_uuids_raw + "\nSummary: " + summaryText
					if err := utils.SendGmailNotification(userEmail, subject, body); err != nil {
						log.Println("[DEBUG] Failed to send email notification:", err)
					} else {
						log.Println("[DEBUG] Email notification sent to:", userEmail)
					}
				} else {
					log.Println("[DEBUG] No email found for user:", doc.UUID)
				}
			}
		}(storagePath, fuuid)
	}

	if len(uploaded) == 0 {
		log.Println("[DEBUG] No documents uploaded successfully.")
		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(nil)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(uploaded)
}
