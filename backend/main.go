/*
TODO: for self

==>i'm sure that main has to be optimized
==>if(check if i'm using pgadmin cli tools(probably not) ==true){where and y}else remove the functions
==>balance the handlers and utils folders
==>check which model i'm runn'n on the collab for summary(remove emoji's)
==>go through the comments in each file for task verification(at the top)
==>check what all i am using from config/config.go and utlis/helper.go
*/
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
		log.Println("Missing SUPABASE_URL or SUPABASE_SERVICE_KEY")
		return
	}

	endpoint := fmt.Sprintf("%s/rest/v1/test_connection?limit=1", url)

	req, err := http.NewRequest("GET", endpoint, nil)
	if err != nil {
		log.Printf("Failed to build DB request: %v\n", err)
		return
	}
	req.Header.Set("Authorization", "Bearer "+key)
	req.Header.Set("apikey", key)

	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		log.Printf("Failed DB connection: %v\n", err)
		return
	}
	defer resp.Body.Close()

	if resp.StatusCode >= 400 {
		log.Printf("DB responded with error: %s\n", resp.Status)
		return
	}

	var rows []map[string]interface{}
	if err := json.NewDecoder(resp.Body).Decode(&rows); err != nil {
		log.Printf("Could not decode DB response: %v\n", err)
		return
	}

	if len(rows) == 0 {
		log.Println("Connected to Supabase, but no rows in test_connection table yet")
	} else {
		log.Printf("Connected! Found a row: %+v\n", rows[0])
	}
}

func main() {
	if err := godotenv.Load(); err != nil {
		log.Println("No .env file found, falling back to system environment")
	}

	config.InitConfig()
	log.Println("Config initialized.")

	checkDBConnection()

	connStr := os.Getenv("DATABASE_URL")
	if err := config.InitDB(connStr); err != nil {
		log.Fatalf("Failed to connect to DB: %v", err)
	}

	//Define HTTP routes
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

	//CORS Health check
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

	//Start notification polling goroutine
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

	//Start quick share notification polling goroutine
	go func() {
		for {
			log.Println("[QUICK_SHARE] Polling for new quick_share entries...")
			rows, err := config.DB.Query(`SELECT qs_uuid, d_uuid, data FROM quick_share WHERE is_sent = false`)
			if err != nil {
				log.Println("[QUICK_SHARE] DB query error:", err)
				time.Sleep(5 * time.Second)
				continue
			}
			for rows.Next() {
				var qsUUID, dUUID string
				var data string
				if err := rows.Scan(&qsUUID, &dUUID, &data); err != nil {
					log.Println("[QUICK_SHARE] Row scan error:", err)
					continue
				}
				log.Printf("[QUICK_SHARE] Processing qs_uuid: %s, d_uuid: %s", qsUUID, dUUID)

				// Parse the JSON data
				var dataMap map[string]interface{}
				if err := json.Unmarshal([]byte(data), &dataMap); err != nil {
					log.Printf("[QUICK_SHARE] Failed to parse data JSON: %v", err)
					continue
				}

				// Format the content
				formatted := "You have received a quick share:\n\n"
				for k, v := range dataMap {
					formatted += fmt.Sprintf("%s: %v\n", k, v)
				}

				rows2, err := config.DB.Query("SELECT position, email FROM users WHERE d_uuid = $1", dUUID)
				if err != nil {
					log.Printf("[QUICK_SHARE] User lookup error for d_uuid %s: %v", dUUID, err)
					continue
				}
				sent := false
				for rows2.Next() {
					var position, email string
					if err := rows2.Scan(&position, &email); err != nil {
						log.Printf("[QUICK_SHARE] User scan error: %v", err)
						continue
					}
					log.Printf("[QUICK_SHARE] User position: %s, email: %s", position, email)
					if position == "head" && email != "" {
						subject := "Quick Share Notification"
						body := formatted
						log.Printf("[QUICK_SHARE] Sending email to %s...", email)
						if err := utils.SendGmailNotification(email, subject, body); err != nil {
							log.Println("[QUICK_SHARE] Failed to send email:", err)
						} else {
							log.Printf("[QUICK_SHARE] Email sent to: %s", email)
							sent = true
						}
					}
				}
				rows2.Close()
				if sent {
					_, err := config.DB.Exec("UPDATE quick_share SET is_sent = true WHERE qs_uuid = $1", qsUUID)
					if err != nil {
						log.Println("[QUICK_SHARE] Failed to update is_sent:", err)
					} else {
						log.Printf("[QUICK_SHARE] Marked qs_uuid %s as sent.", qsUUID)
					}
				}
			}
			rows.Close()
			time.Sleep(10 * time.Second)
		}
	}()

	//Start HTTP server
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
		log.Fatalf("Server failed: %v", err)
	}
}
