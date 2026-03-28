package handlers

import (
	"bytes"
	"crypto/rand"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"io"
	"log"
	"net/http"
	"strings"
	"sync"
	"time"

	"backend/config"
)

// ---------------------------------------------------------------------------
// Admin session store (in-memory)
// ---------------------------------------------------------------------------

type adminSession struct {
	AdminID   string
	Username  string
	ExpiresAt time.Time
}

var (
	adminSessions = sync.Map{} // map[token]adminSession
)

// generateToken creates a secure random hex token.
func generateToken() (string, error) {
	b := make([]byte, 32)
	if _, err := rand.Read(b); err != nil {
		return "", err
	}
	return hex.EncodeToString(b), nil
}

// AdminAuthMiddleware verifies the admin Bearer token.
func AdminAuthMiddleware(next http.HandlerFunc) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		setCORS(w)
		if r.Method == http.MethodOptions {
			w.WriteHeader(http.StatusOK)
			return
		}

		auth := r.Header.Get("Authorization")
		if !strings.HasPrefix(auth, "Bearer ") {
			http.Error(w, `{"error":"missing admin token"}`, http.StatusUnauthorized)
			return
		}
		token := strings.TrimPrefix(auth, "Bearer ")

		val, ok := adminSessions.Load(token)
		if !ok {
			http.Error(w, `{"error":"invalid or expired admin token"}`, http.StatusUnauthorized)
			return
		}
		sess := val.(adminSession)
		if time.Now().After(sess.ExpiresAt) {
			adminSessions.Delete(token)
			http.Error(w, `{"error":"admin session expired"}`, http.StatusUnauthorized)
			return
		}

		next(w, r)
	}
}

func setCORS(w http.ResponseWriter) {
	w.Header().Set("Access-Control-Allow-Origin", "*")
	w.Header().Set("Access-Control-Allow-Methods", "POST, GET, PUT, DELETE, OPTIONS")
	w.Header().Set("Access-Control-Allow-Headers", "Content-Type, Authorization")
}

// ---------------------------------------------------------------------------
// POST /v1/admin/login
// ---------------------------------------------------------------------------

type adminLoginReq struct {
	Username string `json:"username"`
	Password string `json:"password"`
}

type adminLoginResp struct {
	Token    string `json:"token"`
	AdminID  string `json:"adminId"`
	Username string `json:"username"`
}

func AdminLoginHandler(w http.ResponseWriter, r *http.Request) {
	setCORS(w)
	if r.Method == http.MethodOptions {
		w.WriteHeader(http.StatusOK)
		return
	}
	if r.Method != http.MethodPost {
		http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
		return
	}

	var req adminLoginReq
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, `{"error":"invalid request body"}`, http.StatusBadRequest)
		return
	}

	// Verify credentials against the admin table
	var aUUID, storedPass string
	err := config.DB.QueryRow(
		"SELECT a_uuid, a_pass FROM admin WHERE a_username = $1", req.Username,
	).Scan(&aUUID, &storedPass)

	if err != nil {
		http.Error(w, `{"error":"admin username not found"}`, http.StatusUnauthorized)
		return
	}
	if storedPass != req.Password {
		http.Error(w, `{"error":"invalid admin credentials"}`, http.StatusUnauthorized)
		return
	}

	token, err := generateToken()
	if err != nil {
		http.Error(w, `{"error":"failed to generate session"}`, http.StatusInternalServerError)
		return
	}

	adminSessions.Store(token, adminSession{
		AdminID:   aUUID,
		Username:  req.Username,
		ExpiresAt: time.Now().Add(24 * time.Hour),
	})

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(adminLoginResp{
		Token:    token,
		AdminID:  aUUID,
		Username: req.Username,
	})
}

// ---------------------------------------------------------------------------
// POST /v1/admin/logout
// ---------------------------------------------------------------------------

func AdminLogoutHandler(w http.ResponseWriter, r *http.Request) {
	setCORS(w)
	if r.Method == http.MethodOptions {
		w.WriteHeader(http.StatusOK)
		return
	}
	auth := r.Header.Get("Authorization")
	if strings.HasPrefix(auth, "Bearer ") {
		token := strings.TrimPrefix(auth, "Bearer ")
		adminSessions.Delete(token)
	}
	w.Header().Set("Content-Type", "application/json")
	w.Write([]byte(`{"ok":true}`))
}

// ---------------------------------------------------------------------------
// Supabase Auth Admin API helpers
// ---------------------------------------------------------------------------

func supabaseAuthURL() string {
	return config.Supabase.URL + "/auth/v1/admin/users"
}

func serviceRoleKey() string {
	return config.Supabase.ServiceRoleKey
}

// supabaseAuthRequest makes a request to the Supabase Auth Admin API.
func supabaseAuthRequest(method, url string, body io.Reader) (*http.Response, error) {
	req, err := http.NewRequest(method, url, body)
	if err != nil {
		return nil, err
	}
	req.Header.Set("Authorization", "Bearer "+serviceRoleKey())
	req.Header.Set("apikey", serviceRoleKey())
	req.Header.Set("Content-Type", "application/json")
	return http.DefaultClient.Do(req)
}

// forwardJSON reads a Supabase response and writes it to the HTTP response writer.
func forwardJSON(w http.ResponseWriter, resp *http.Response) {
	defer resp.Body.Close()
	respBody, _ := io.ReadAll(resp.Body)
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(resp.StatusCode)
	w.Write(respBody)
}

// ---------------------------------------------------------------------------
// GET /v1/admin/users — list all users with auth enrichment
// ---------------------------------------------------------------------------

func AdminListUsersHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
		return
	}

	// 1. Fetch users from public.users (with joins)
	rows, err := config.DB.Query(`
		SELECT
			u.uuid, u.name, u.email, u.phone_number, u.address, u.position,
			d.d_uuid, d.d_name,
			r.r_uuid, r.r_name
		FROM users u
		LEFT JOIN department d ON u.d_uuid = d.d_uuid
		LEFT JOIN role r ON u.r_uuid = r.r_uuid
		ORDER BY u.name
	`)
	if err != nil {
		log.Printf("[ADMIN] Failed to query users: %v", err)
		http.Error(w, `{"error":"failed to fetch users"}`, http.StatusInternalServerError)
		return
	}
	defer rows.Close()

	type userRow struct {
		UUID        string  `json:"uuid"`
		Name        *string `json:"name"`
		Email       *string `json:"email"`
		PhoneNumber *string `json:"phone_number"`
		Address     *string `json:"address"`
		Position    *string `json:"position"`
		Department  *struct {
			DUuid string `json:"d_uuid"`
			DName string `json:"d_name"`
		} `json:"department"`
		Role *struct {
			RUuid string `json:"r_uuid"`
			RName string `json:"r_name"`
		} `json:"role"`
		EmailConfirmedAt *string `json:"email_confirmed_at"`
		LastSignInAt     *string `json:"last_sign_in_at"`
		CreatedAt        *string `json:"created_at"`
	}

	var users []userRow
	for rows.Next() {
		var u userRow
		var dUUID, dName, rUUID, rName *string
		if err := rows.Scan(&u.UUID, &u.Name, &u.Email, &u.PhoneNumber, &u.Address, &u.Position,
			&dUUID, &dName, &rUUID, &rName); err != nil {
			log.Printf("[ADMIN] Row scan error: %v", err)
			continue
		}
		if dUUID != nil && dName != nil {
			u.Department = &struct {
				DUuid string `json:"d_uuid"`
				DName string `json:"d_name"`
			}{*dUUID, *dName}
		}
		if rUUID != nil && rName != nil {
			u.Role = &struct {
				RUuid string `json:"r_uuid"`
				RName string `json:"r_name"`
			}{*rUUID, *rName}
		}
		users = append(users, u)
	}

	// 2. Enrich with auth data from Supabase Auth
	resp, err := supabaseAuthRequest("GET", supabaseAuthURL(), nil)
	if err == nil && resp.StatusCode == http.StatusOK {
		defer resp.Body.Close()
		var authResp struct {
			Users []struct {
				ID               string  `json:"id"`
				EmailConfirmedAt *string `json:"email_confirmed_at"`
				LastSignInAt     *string `json:"last_sign_in_at"`
				CreatedAt        *string `json:"created_at"`
			} `json:"users"`
		}
		if err := json.NewDecoder(resp.Body).Decode(&authResp); err == nil {
			authMap := make(map[string]struct {
				EmailConfirmedAt *string
				LastSignInAt     *string
				CreatedAt        *string
			})
			for _, au := range authResp.Users {
				authMap[au.ID] = struct {
					EmailConfirmedAt *string
					LastSignInAt     *string
					CreatedAt        *string
				}{au.EmailConfirmedAt, au.LastSignInAt, au.CreatedAt}
			}
			for i := range users {
				if au, ok := authMap[users[i].UUID]; ok {
					users[i].EmailConfirmedAt = au.EmailConfirmedAt
					users[i].LastSignInAt = au.LastSignInAt
					users[i].CreatedAt = au.CreatedAt
				}
			}
		}
	} else if resp != nil {
		resp.Body.Close()
	}

	if users == nil {
		users = []userRow{}
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(users)
}

// ---------------------------------------------------------------------------
// POST /v1/admin/users — create a new user via Supabase Auth
// ---------------------------------------------------------------------------

type createUserReq struct {
	Email        string                 `json:"email"`
	Password     string                 `json:"password"`
	UserMetadata map[string]interface{} `json:"user_metadata"`
}

func AdminCreateUserHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
		return
	}

	var req createUserReq
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, `{"error":"invalid request body"}`, http.StatusBadRequest)
		return
	}

	// Basic server-side validation
	if req.Email == "" || req.Password == "" {
		http.Error(w, `{"error":"email and password are required"}`, http.StatusBadRequest)
		return
	}
	if len(req.Password) < 6 {
		http.Error(w, `{"error":"password must be at least 6 characters"}`, http.StatusBadRequest)
		return
	}

	// Build the Supabase Auth Admin API payload
	// email_confirm: false → Supabase marks the email as unverified, then we trigger
	// the confirmation email separately via /auth/v1/resend.
	payload := map[string]interface{}{
		"email":         req.Email,
		"password":      req.Password,
		"email_confirm": false,
		"user_metadata": req.UserMetadata,
	}
	body, _ := json.Marshal(payload)

	resp, err := supabaseAuthRequest("POST", supabaseAuthURL(), bytes.NewReader(body))
	if err != nil {
		log.Printf("[ADMIN] Failed to call Supabase Auth: %v", err)
		http.Error(w, `{"error":"failed to create user in auth"}`, http.StatusInternalServerError)
		return
	}

	// Log non-success responses from Supabase so we can debug
	if resp.StatusCode >= 400 {
		respBody, _ := io.ReadAll(resp.Body)
		resp.Body.Close()
		log.Printf("[ADMIN] Supabase create-user returned %d: %s", resp.StatusCode, string(respBody))
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(resp.StatusCode)
		w.Write(respBody)
		return
	}

	// User created successfully — send the confirmation email in the background.
	go sendConfirmationEmail(req.Email)

	forwardJSON(w, resp)
}

// sendConfirmationEmail triggers Supabase to send the signup-confirmation email
// by calling POST /auth/v1/resend with the anon key.
func sendConfirmationEmail(email string) {
	resendURL := config.Supabase.URL + "/auth/v1/resend"
	payload, _ := json.Marshal(map[string]string{
		"type":  "signup",
		"email": email,
	})

	req, err := http.NewRequest("POST", resendURL, bytes.NewReader(payload))
	if err != nil {
		log.Printf("[ADMIN] Failed to build resend request: %v", err)
		return
	}
	req.Header.Set("apikey", config.Supabase.Key) // anon key
	req.Header.Set("Content-Type", "application/json")

	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		log.Printf("[ADMIN] Failed to call /auth/v1/resend: %v", err)
		return
	}
	defer resp.Body.Close()

	if resp.StatusCode >= 400 {
		body, _ := io.ReadAll(resp.Body)
		log.Printf("[ADMIN] /auth/v1/resend returned %d: %s", resp.StatusCode, string(body))
	} else {
		log.Printf("[ADMIN] Confirmation email sent to %s", email)
	}
}

// ---------------------------------------------------------------------------
// PUT /v1/admin/users?id=<uuid> — update a user via Supabase Auth
// ---------------------------------------------------------------------------

type updateUserReq struct {
	UserMetadata map[string]interface{} `json:"user_metadata"`
}

func AdminUpdateUserHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPut {
		http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
		return
	}

	userID := r.URL.Query().Get("id")
	if userID == "" {
		http.Error(w, `{"error":"missing user id"}`, http.StatusBadRequest)
		return
	}

	var req updateUserReq
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, `{"error":"invalid request body"}`, http.StatusBadRequest)
		return
	}

	payload := map[string]interface{}{
		"user_metadata": req.UserMetadata,
	}
	body, _ := json.Marshal(payload)

	url := fmt.Sprintf("%s/%s", supabaseAuthURL(), userID)
	resp, err := supabaseAuthRequest("PUT", url, bytes.NewReader(body))
	if err != nil {
		log.Printf("[ADMIN] Failed to update auth user: %v", err)
		http.Error(w, `{"error":"failed to update user in auth"}`, http.StatusInternalServerError)
		return
	}

	forwardJSON(w, resp)
}

// ---------------------------------------------------------------------------
// DELETE /v1/admin/users?id=<uuid> — delete a user from auth + public.users
// ---------------------------------------------------------------------------

func AdminDeleteUserHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodDelete {
		http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
		return
	}

	userID := r.URL.Query().Get("id")
	if userID == "" {
		http.Error(w, `{"error":"missing user id"}`, http.StatusBadRequest)
		return
	}

	// 1. Delete from Supabase Auth
	url := fmt.Sprintf("%s/%s", supabaseAuthURL(), userID)
	resp, err := supabaseAuthRequest("DELETE", url, nil)
	authDeleted := false
	if err == nil {
		resp.Body.Close()
		authDeleted = resp.StatusCode < 300
	}

	// 2. Delete from public.users
	_, dbErr := config.DB.Exec("DELETE FROM users WHERE uuid = $1", userID)

	w.Header().Set("Content-Type", "application/json")
	if dbErr != nil {
		log.Printf("[ADMIN] Failed to delete user from DB: %v", dbErr)
		w.WriteHeader(http.StatusInternalServerError)
		json.NewEncoder(w).Encode(map[string]interface{}{
			"error":        "failed to delete user from database",
			"auth_deleted": authDeleted,
		})
		return
	}

	json.NewEncoder(w).Encode(map[string]interface{}{
		"ok":           true,
		"auth_deleted": authDeleted,
	})
}
