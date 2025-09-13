package handlers

import (
	"encoding/json"
	"fmt"
	"net/http"

	"backend/config"
	"backend/models"
)

func ListDocumentsHandler(w http.ResponseWriter, r *http.Request) {
	endpoint := fmt.Sprintf("%s/rest/v1/documents?select=*", config.Supabase.URL)

	req, _ := http.NewRequest("GET", endpoint, nil)
	req.Header.Set("Authorization", "Bearer "+config.Supabase.Key)
	req.Header.Set("apikey", config.Supabase.Key)

	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		http.Error(w, "Failed to fetch documents", http.StatusInternalServerError)
		return
	}
	defer resp.Body.Close()

	var docs []models.Document
	if err := json.NewDecoder(resp.Body).Decode(&docs); err != nil {
		http.Error(w, "Decode error", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(docs)
}
