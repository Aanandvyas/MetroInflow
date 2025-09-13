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

// ✅ Allowed departments
var allowedDepartments = map[string]bool{
	"Civil & Track Department":                  true,
	"Customer Relations & Marketing Department": true,
	"Emergency & Maintenance Department":        true,
	"Finance & Procurement Department":          true,
	"Signaling & Telecommunications Department": true,
	"Train Operations Department":               true,
}

// UploadDocumentsHandler handles multiple file uploads
func UploadDocumentsHandler(w http.ResponseWriter, r *http.Request) {
	err := r.ParseMultipartForm(50 << 20) // 50 MB
	if err != nil {
		http.Error(w, "Failed to parse form", http.StatusBadRequest)
		return
	}

	files := r.MultipartForm.File["files"]
	if len(files) == 0 {
		http.Error(w, "No files uploaded", http.StatusBadRequest)
		return
	}

	dept := r.FormValue("department")
	log.Printf("[DEBUG] Received department: '%s'\n", dept)
	if !allowedDepartments[dept] {
		http.Error(w, "Invalid department", http.StatusBadRequest)
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

		// Path → Department/timestamp_filename
		storagePath := filepath.Join(dept, time.Now().Format("20060102150405")+"_"+f.Filename)

		// Use buffer for upload
		if err := config.Supabase.UploadFile("file_storage", storagePath, buf); err != nil {
			log.Printf("Upload error for %s: %+v\n", f.Filename, err)
			continue
		}

		// Insert into DB
		doc := models.Document{
			FileName:    f.Filename,
			StoragePath: storagePath,
			Department:  dept,
			Status:      "uploaded",
		}

		id, err := config.Supabase.InsertDocument(doc)
		if err != nil {
			log.Printf("InsertDocument error for %s: %+v\n", doc.FileName, err)
			continue
		}
		doc.ID = id
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
