package handlers

import (
	"encoding/json"
	"fmt"
	"net/http"
	"strings"
	"time"

	"backend/config"
)

// AuthenticatedUserIDFromRequest validates Supabase JWT and returns auth user id.
func AuthenticatedUserIDFromRequest(r *http.Request) (string, error) {
	auth := r.Header.Get("Authorization")
	if !strings.HasPrefix(auth, "Bearer ") {
		return "", fmt.Errorf("missing bearer token")
	}
	token := strings.TrimPrefix(auth, "Bearer ")

	if config.Supabase.URL == "" || config.Supabase.Key == "" {
		return "", fmt.Errorf("supabase auth config missing")
	}

	req, err := http.NewRequest(http.MethodGet, config.Supabase.URL+"/auth/v1/user", nil)
	if err != nil {
		return "", err
	}
	req.Header.Set("apikey", config.Supabase.Key)
	req.Header.Set("Authorization", "Bearer "+token)

	client := &http.Client{Timeout: 10 * time.Second}
	resp, err := client.Do(req)
	if err != nil {
		return "", err
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return "", fmt.Errorf("invalid auth token")
	}

	var userResp map[string]interface{}
	if err := json.NewDecoder(resp.Body).Decode(&userResp); err != nil {
		return "", err
	}

	uid, _ := userResp["id"].(string)
	if uid == "" {
		return "", fmt.Errorf("user id not found in token")
	}
	return uid, nil
}
