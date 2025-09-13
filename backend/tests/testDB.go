package main

import (
	"encoding/json"
	"fmt"
	"net/http"
	"os"

	"github.com/joho/godotenv"
)

type Document struct {
	ID          string `json:"id"`
	FileName    string `json:"file_name"`
	StoragePath string `json:"storage_path"`
	Department  string `json:"department"`
	Status      string `json:"status"`
	CreatedAt   string `json:"created_at"`
	UpdatedAt   string `json:"updated_at"`
}

func main() {
	// Load .env file
	err := godotenv.Load()
	if err != nil {
		fmt.Println("⚠️ Could not load .env file, falling back to system environment")
	}

	url := os.Getenv("SUPABASE_URL")
	key := os.Getenv("SUPABASE_KEY")

	if url == "" || key == "" {
		fmt.Println("❌ Missing SUPABASE_URL or SUPABASE_KEY")
		return
	}

	endpoint := fmt.Sprintf("%s/rest/v1/documents?limit=1", url)

	req, err := http.NewRequest("GET", endpoint, nil)
	if err != nil {
		panic(err)
	}
	req.Header.Set("Authorization", "Bearer "+key)
	req.Header.Set("apikey", key)

	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		panic(err)
	}
	defer resp.Body.Close()

	if resp.StatusCode >= 400 {
		panic(fmt.Sprintf("❌ Failed request: %s", resp.Status))
	}

	var docs []Document
	if err := json.NewDecoder(resp.Body).Decode(&docs); err != nil {
		panic(err)
	}

	if len(docs) == 0 {
		fmt.Println("✅ Connected to Supabase, but no rows in documents table yet")
	} else {
		fmt.Printf("✅ Connected! Found a document: %+v\n", docs[0])
	}
}
