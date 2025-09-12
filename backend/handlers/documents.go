package handlers

import (
	"backend/models"
	"encoding/json"
	"net/http"
	"strconv"
	"strings"
)

func GetDocumentHandler(w http.ResponseWriter, r *http.Request) {
	id := strings.TrimPrefix(r.URL.Path, "/v1/documents/") // naive extraction
	doc, err := models.GetDocumentByID(id)
	if err != nil {
		http.Error(w, "Document not found", 404)
		return
	}

	resp, _ := json.Marshal(doc)
	w.Header().Set("Content-Type", "application/json")
	w.Write(resp)
}

func ListDocumentsHandler(w http.ResponseWriter, r *http.Request) {
	status := r.URL.Query().Get("status") // optional
	limitStr := r.URL.Query().Get("limit")
	limit := 20
	if limitStr != "" {
		if l, err := strconv.Atoi(limitStr); err == nil {
			limit = l
		}
	}

	docs, err := models.ListDocuments(status, limit)
	if err != nil {
		http.Error(w, "Error fetching documents", 500)
		return
	}

	resp, _ := json.Marshal(docs)
	w.Header().Set("Content-Type", "application/json")
	w.Write(resp)
}
