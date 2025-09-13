package handlers

import (
	"encoding/json"
	"fmt"
	"net/http"

	"backend/config"
	"backend/models"

	"github.com/go-chi/chi/v5"
)

func GetDocumentHandler(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")
	endpoint := fmt.Sprintf("%s/rest/v1/documents?id=eq.%s&select=*", config.Supabase.URL, id)

	req, _ := http.NewRequest("GET", endpoint, nil)
	req.Header.Set("Authorization", "Bearer "+config.Supabase.Key)
	req.Header.Set("apikey", config.Supabase.Key)

	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		http.Error(w, "Fetch failed", http.StatusInternalServerError)
		return
	}
	defer resp.Body.Close()

	var docs []models.Document
	if err := json.NewDecoder(resp.Body).Decode(&docs); err != nil {
		http.Error(w, "Decode error", http.StatusInternalServerError)
		return
	}

	if len(docs) == 0 {
		http.Error(w, "Not found", http.StatusNotFound)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(docs[0])
}
