package handlers

import (
	"backend/models"
	"fmt"
	"net/http"
)

func UploadDocumentsHandler(w http.ResponseWriter, r *http.Request) {
	files := r.MultipartForm.File["files"]
	var ids []string

	for _, fileHeader := range files {
		// Save file to disk (temp folder)
		// ...

		doc, err := models.InsertDocument(fileHeader.Filename)
		if err != nil {
			http.Error(w, "Failed to insert document", 500)
			return
		}
		ids = append(ids, doc.ID)
	}

	w.Header().Set("Content-Type", "application/json")
	w.Write([]byte(`{"doc_ids":` + fmt.Sprintf("%v", ids) + `}`))
}
