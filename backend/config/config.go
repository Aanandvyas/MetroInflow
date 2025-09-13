package config

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"mime/multipart"
	"net/http"
	"net/url"
	"os"
	"path/filepath"

	"backend/models"
)

type SupabaseClient struct {
	URL string
	Key string
}

var Supabase SupabaseClient

// InitConfig loads Supabase credentials
func InitConfig() {
	Supabase = SupabaseClient{
		URL: os.Getenv("SUPABASE_URL"),
		Key: os.Getenv("SUPABASE_SERVICE_KEY"), // Use SERVICE_KEY for consistency with main.go
	}
}

// UploadFile uploads a file to Supabase storage (handles spaces/& in path)
func (s SupabaseClient) UploadFile(bucket, path string, file io.Reader) error {
	encodedPath := url.PathEscape(path)
	endpoint := fmt.Sprintf("%s/storage/v1/object/%s/%s", s.URL, bucket, encodedPath)

	body := &bytes.Buffer{}
	writer := multipart.NewWriter(body)
	part, _ := writer.CreateFormFile("file", filepath.Base(path))
	_, _ = io.Copy(part, file)
	writer.Close()

	req, err := http.NewRequest("POST", endpoint, body)
	if err != nil {
		return err
	}
	req.Header.Set("Authorization", "Bearer "+s.Key)
	req.Header.Set("apikey", s.Key)
	req.Header.Set("Content-Type", writer.FormDataContentType())

	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		return err
	}
	defer resp.Body.Close()

	if resp.StatusCode >= 400 {
		return fmt.Errorf("upload failed: %s", resp.Status)
	}
	return nil
}

// InsertDocument saves metadata into Supabase Postgres
func (s SupabaseClient) InsertDocument(doc models.Document) (string, error) {
	endpoint := fmt.Sprintf("%s/rest/v1/documents", s.URL)

	data, _ := json.Marshal(doc)
	req, err := http.NewRequest("POST", endpoint, bytes.NewBuffer(data))
	if err != nil {
		return "", err
	}

	req.Header.Set("Authorization", "Bearer "+s.Key)
	req.Header.Set("apikey", s.Key)
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Prefer", "return=representation")

	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		return "", err
	}
	defer resp.Body.Close()

	if resp.StatusCode >= 400 {
		return "", fmt.Errorf("insert failed: %s", resp.Status)
	}

	var inserted []models.Document
	if err := json.NewDecoder(resp.Body).Decode(&inserted); err != nil {
		return "", err
	}

	if len(inserted) == 0 {
		return "", fmt.Errorf("no document returned")
	}
	return inserted[0].ID, nil
}
