// most of this file is not being used; need to make some general fns for it to be feasible(get ur ass on it for god's sake)
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

/*TODO
the below fn is not working
*/
// func ListFilesHandler(w http.ResponseWriter, r *http.Request) {
// 	files, err := models.GetAllFiles(config.DB)
// 	if err != nil {
// 		http.Error(w, "Failed to fetch files", http.StatusInternalServerError)
// 		return
// 	}
// 	w.Header().Set("Content-Type", "application/json")
// 	json.NewEncoder(w).Encode(files)
// }

/*
TODO
the below fn is not working
*/
// func ListDepartmentsHandler(w http.ResponseWriter, r *http.Request) {
// 	depts, err := models.GetAllDepartments(config.DB)
// 	if err != nil {
// 		http.Error(w, "Failed to fetch departments", http.StatusInternalServerError)
// 		return
// 	}
// 	w.Header().Set("Content-Type", "application/json")
// 	json.NewEncoder(w).Encode(depts)
// }
