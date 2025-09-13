package models

type Document struct {
	ID          string `json:"id,omitempty"`
	FileName    string `json:"file_name"`
	StoragePath string `json:"storage_path"`
	Department  string `json:"department"`
	Status      string `json:"status"`
}
