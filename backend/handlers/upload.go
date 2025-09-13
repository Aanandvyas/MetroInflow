package handlers

import (
	"bytes"
	"encoding/json"
	"io"
	"log"
	"net/http"
	"path/filepath"
	"time"

	"backend/config"
	"backend/models"
)

// UploadDocumentsHandler handles multiple file uploads
func UploadDocumentsHandler(w http.ResponseWriter, r *http.Request) {
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

	d_uuid := r.FormValue("d_uuid")
	if d_uuid == "" {
		http.Error(w, "Missing department UUID", http.StatusBadRequest)
		return
	}

	// Validate department UUID exists in DB and get department name
	var deptName string
	deptExists := false
	departments, err := models.GetAllDepartments(config.DB)
	if err != nil {
		http.Error(w, "Failed to fetch departments", http.StatusInternalServerError)
		return
	}
	for _, dept := range departments {
		if dept.DUUID == d_uuid {
			deptExists = true
			deptName = dept.DName
			break
		}
	}
	if !deptExists {
		http.Error(w, "Invalid department UUID", http.StatusBadRequest)
		return
	}

	var uploaded []models.Document
	for _, f := range files {
		file, err := f.Open()
		if err != nil {
			log.Println("Error opening file:", err)
			continue
		}
		defer file.Close()

		// Read file into buffer for upload
		buf := new(bytes.Buffer)
		_, err = io.Copy(buf, file)
		if err != nil {
			log.Println("Error reading file to buffer:", err)
			continue
		}

		// Use department name for storage path
		storagePath := filepath.Join(deptName, time.Now().Format("20060102150405")+"_"+f.Filename)

		// Use buffer for upload
		if err := config.Supabase.UploadFile("file_storage", storagePath, buf); err != nil {
			log.Printf("Upload error for %s: %+v\n", f.Filename, err)
			continue
		}

		// Insert into DB
		doc := models.Document{
			FileName: f.Filename,
			Language: "en", // or get from form
			FilePath: storagePath,
			DUUID:    d_uuid,
			Status:   "uploaded",
		}

		fuuid, err := models.InsertDocument(config.DB, doc)
		if err != nil {
			log.Printf("InsertDocument error for %s: %+v\n", doc.FileName, err)
			continue
		}
		doc.FUUID = fuuid

		// Optionally link file to department
		_ = models.InsertFileDepartment(config.DB, fuuid, d_uuid)

		uploaded = append(uploaded, doc)
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
