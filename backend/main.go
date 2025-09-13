package main

import (
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"os"
	"time"

	"backend/config"
	"backend/handlers"

	"github.com/joho/godotenv"
)

func checkDBConnection() {
	url := os.Getenv("SUPABASE_URL")
	key := os.Getenv("SUPABASE_SERVICE_KEY")

	if url == "" || key == "" {
		log.Println("❌ Missing SUPABASE_URL or SUPABASE_SERVICE_KEY")
		return
	}

	endpoint := fmt.Sprintf("%s/rest/v1/documents?limit=1", url)

	req, err := http.NewRequest("GET", endpoint, nil)
	if err != nil {
		log.Printf("❌ Failed to build DB request: %v\n", err)
		return
	}
	req.Header.Set("Authorization", "Bearer "+key)
	req.Header.Set("apikey", key)

	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		log.Printf("❌ Failed DB connection: %v\n", err)
		return
	}
	defer resp.Body.Close()

	if resp.StatusCode >= 400 {
		log.Printf("❌ DB responded with error: %s\n", resp.Status)
		return
	}

	var docs []map[string]interface{}
	if err := json.NewDecoder(resp.Body).Decode(&docs); err != nil {
		log.Printf("❌ Could not decode DB response: %v\n", err)
		return
	}

	log.Println("✅ Successfully connected to Supabase DB")
}

func main() {
	// 1️⃣ Load .env file
	if err := godotenv.Load(); err != nil {
		log.Println("⚠️ No .env file found, falling back to system environment")
	}

	// 2️⃣ Initialize config (Supabase client)
	config.InitConfig()
	log.Println("✅ Config initialized.")

	// 3️⃣ Test DB connection
	checkDBConnection()

	connStr := os.Getenv("DATABASE_URL")
	if err := config.InitDB(connStr); err != nil {
		log.Fatalf("Failed to connect to DB: %v", err)
	}

	// 4️⃣ Define HTTP routes
	http.HandleFunc("/v1/documents", func(w http.ResponseWriter, r *http.Request) {
		if r.Method == http.MethodPost {
			handlers.UploadDocumentsHandler(w, r)
		} else {
			http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		}
	})
	// http.HandleFunc("/v1/files", handlers.ListFilesHandler)
	// http.HandleFunc("/v1/files/", handlers.GetFileHandler)
	// http.HandleFunc("/v1/departments", handlers.ListDepartmentsHandler)

	// 5️⃣ Health check
	http.HandleFunc("/health", func(w http.ResponseWriter, r *http.Request) {
		w.Write([]byte("OK"))
	})

	// 6️⃣ Start HTTP server
	port := os.Getenv("PORT")
	if port == "" {
		port = "8080"
	}
	srv := &http.Server{
		Addr:         ":" + port,
		ReadTimeout:  10 * time.Second,
		WriteTimeout: 30 * time.Second,
		IdleTimeout:  60 * time.Second,
	}

	log.Printf("🚀 Server started at http://localhost:%s\n", port)
	if err := srv.ListenAndServe(); err != nil {
		log.Fatalf("❌ Server failed: %v", err)
	}
}
