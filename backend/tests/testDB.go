package main

import (
	"encoding/json"
	"fmt"
	"net/http"
	"os"

	"github.com/joho/godotenv"
)

type TestConnection struct {
	ID      int    `json:"id"`
	Message string `json:"message"`
}

func main() {
	// Load .env file
	err := godotenv.Load()
	if err != nil {
		fmt.Println("⚠️ Could not load .env file, falling back to system environment")
	}

	url := os.Getenv("SUPABASE_URL")
	key := os.Getenv("SUPABASE_SERVICE_KEY")

	if url == "" || key == "" {
		fmt.Println("❌ Missing SUPABASE_URL or SUPABASE_SERVICE_KEY")
		return
	}

	endpoint := fmt.Sprintf("%s/rest/v1/test_connection?limit=1", url)

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

	var rows []TestConnection
	if err := json.NewDecoder(resp.Body).Decode(&rows); err != nil {
		panic(err)
	}

	if len(rows) == 0 {
		fmt.Println("✅ Connected to Supabase, but no rows in test_connection table yet")
	} else {
		fmt.Printf("✅ Connected! Found a row: %+v\n", rows[0])
	}
}
