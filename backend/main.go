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
	"backend/utils"

	"github.com/joho/godotenv"
)

func checkDBConnection() {
	url := os.Getenv("SUPABASE_URL")
	key := os.Getenv("SUPABASE_SERVICE_KEY")

	if url == "" || key == "" {
		log.Println("❌ Missing SUPABASE_URL or SUPABASE_SERVICE_KEY")
		return
	}

	endpoint := fmt.Sprintf("%s/rest/v1/file?limit=1", url)

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
		w.Header().Set("Access-Control-Allow-Origin", "*")
		w.Header().Set("Access-Control-Allow-Methods", "POST, GET, OPTIONS, PUT, DELETE")
		w.Header().Set("Access-Control-Allow-Headers", "Content-Type, Authorization")
		if r.Method == http.MethodOptions {
			w.WriteHeader(http.StatusOK)
			return
		}
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
		w.Header().Set("Access-Control-Allow-Origin", "*")
		w.Header().Set("Access-Control-Allow-Methods", "POST, GET, OPTIONS, PUT, DELETE")
		w.Header().Set("Access-Control-Allow-Headers", "Content-Type, Authorization")
		if r.Method == http.MethodOptions {
			w.WriteHeader(http.StatusOK)
			return
		}
		w.Write([]byte("OK"))
	})

	// 6️⃣ Start notification polling goroutine
	go func() {
		for {
			rows, err := config.DB.Query(`SELECT notif_id, uuid, f_uuid FROM notifications WHERE is_sent = false`)
			if err != nil {
				log.Println("[NOTIF] DB query error:", err)
				time.Sleep(10 * time.Second)
				continue
			}
			for rows.Next() {
				var notifID, uuid, fuuid string
				if err := rows.Scan(&notifID, &uuid, &fuuid); err != nil {
					log.Println("[NOTIF] Row scan error:", err)
					continue
				}
				// Fetch user email
				var userEmail string
				row := config.DB.QueryRow("SELECT email FROM users WHERE uuid = $1", uuid)
				_ = row.Scan(&userEmail)
				// Fetch file name
				var fileName string
				row2 := config.DB.QueryRow("SELECT f_name FROM file WHERE f_uuid = $1", fuuid)
				_ = row2.Scan(&fileName)
				if userEmail != "" && fileName != "" {
					subject := "New file uploaded: " + fileName
					body := "A new file has been added to your account.\n\nFile: " + fileName
					if err := utils.SendGmailNotification(userEmail, subject, body); err != nil {
						log.Println("[NOTIF] Failed to send email:", err)
					} else {
						log.Println("[NOTIF] Email sent to:", userEmail)
						// Mark notification as sent
						_, err := config.DB.Exec("UPDATE notifications SET is_sent = true WHERE notif_id = $1", notifID)
						if err != nil {
							log.Println("[NOTIF] Failed to update is_sent:", err)
						}
					}
				}
			}
			rows.Close()
			time.Sleep(10 * time.Second)
		}
	}()

	// 7️⃣ Start HTTP server
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
