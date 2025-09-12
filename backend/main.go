package main

import (
	"log"
	"net/http"
	"os"
	"strings"
	"time"

	"backend/config"
	"backend/handlers"
	"backend/workers"
)

func main() {
	// 1️⃣ Load environment variables and initialize Supabase client
	config.InitConfig()
	log.Println("Config initialized.")

	// 2️⃣ Start background workers
	go func() {
		log.Println("Starting OCR Worker...")
		workers.OCRWorker()
	}()

	go func() {
		log.Println("Starting Summarizer Worker...")
		workers.SummarizerWorker()
	}()

	// 3️⃣ Define HTTP routes
	http.HandleFunc("/v1/documents", func(w http.ResponseWriter, r *http.Request) {
		if r.Method == http.MethodPost {
			handlers.UploadDocumentsHandler(w, r)
		} else if r.Method == http.MethodGet {
			handlers.ListDocumentsHandler(w, r)
		} else {
			http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		}
	})

	// Routes for /v1/documents/{id} and /v1/documents/{id}/process
	http.HandleFunc("/v1/documents/", func(w http.ResponseWriter, r *http.Request) {
		path := r.URL.Path[len("/v1/documents/"):] // extract trailing path

		if strings.HasSuffix(path, "/process") && r.Method == http.MethodPost {
			handlers.ProcessDocumentHandler(w, r)
			return
		}

		if r.Method == http.MethodGet {
			handlers.GetDocumentHandler(w, r)
			return
		}

		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
	})

	// 4️⃣ Health check
	http.HandleFunc("/health", func(w http.ResponseWriter, r *http.Request) {
		w.Write([]byte("OK"))
	})

	// 5️⃣ Start HTTP server
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

	log.Printf("Server started at http://localhost:%s\n", port)
	if err := srv.ListenAndServe(); err != nil {
		log.Fatalf("Server failed: %v", err)
	}
}
