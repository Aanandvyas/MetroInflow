package config

import (
	"bytes"
	"database/sql"
	"encoding/json"
	"fmt"
	"io"
	"log"
	"mime/multipart"
	"net/http"
	"net/url"
	"os"
	"path/filepath"

	_ "github.com/lib/pq"

	"backend/models"
)

type SupabaseClient struct {
	URL            string
	Key            string
	ServiceRoleKey string
}

// DownloadFile downloads a file from Supabase Storage to a local path
func (s SupabaseClient) DownloadFile(bucket, path, localPath string) error {
	encodedPath := url.PathEscape(path)
	endpoint := fmt.Sprintf("%s/storage/v1/object/%s/%s", s.URL, bucket, encodedPath)

	req, err := http.NewRequest("GET", endpoint, nil)
	if err != nil {
		return err
	}
	req.Header.Set("Authorization", "Bearer "+s.Key)
	req.Header.Set("apikey", s.Key)

	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		return err
	}
	defer resp.Body.Close()

	if resp.StatusCode >= 400 {
		return fmt.Errorf("download failed: %s", resp.Status)
	}

	outFile, err := os.Create(localPath)
	if err != nil {
		return err
	}
	defer outFile.Close()

	_, err = io.Copy(outFile, resp.Body)
	return err
}

var Supabase SupabaseClient
var DB *sql.DB

// InitConfig loads Supabase credentials
func InitConfig() {
	serviceRoleKey := os.Getenv("SUPABASE_SERVICE_ROLE_KEY")
	// Support both the new SUPABASE_ANON_KEY name and the legacy SUPABASE_SERVICE_KEY name
	anonKey := os.Getenv("SUPABASE_ANON_KEY")
	if anonKey == "" {
		anonKey = os.Getenv("SUPABASE_SERVICE_KEY")
	}

	// If the dedicated service-role key var is empty, fall back to
	// SUPABASE_SERVICE_KEY. Many setups store the service-role key there.
	if serviceRoleKey == "" {
		serviceRoleKey = anonKey
		log.Println("WARNING: SUPABASE_SERVICE_ROLE_KEY not set — falling back to SUPABASE_SERVICE_KEY")
	}

	Supabase = SupabaseClient{
		URL:            os.Getenv("SUPABASE_URL"),
		Key:            anonKey,
		ServiceRoleKey: serviceRoleKey,
	}

	if Supabase.ServiceRoleKey == "" {
		log.Println("ERROR: No Supabase service role key found — admin auth API operations will fail")
	}
}

// InitDB initializes the database connection
func InitDB(connStr string) error {
	var err error
	DB, err = sql.Open("postgres", connStr)
	if err != nil {
		return err
	}
	return DB.Ping()
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
	return inserted[0].FUUID, nil
}
