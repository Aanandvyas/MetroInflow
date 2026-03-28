package handlers

import (
	"net/http"
	"os"
)

func allowedOrigin() string {
	origin := os.Getenv("CORS_ALLOW_ORIGIN")
	if origin == "" {
		return "http://localhost:3000"
	}
	return origin
}

// ApplyCORS applies restrictive CORS and handles preflight requests.
func ApplyCORS(w http.ResponseWriter, r *http.Request, methods string) bool {
	origin := r.Header.Get("Origin")
	allow := allowedOrigin()
	if origin == "" || origin == allow {
		w.Header().Set("Access-Control-Allow-Origin", allow)
	}
	w.Header().Set("Vary", "Origin")
	w.Header().Set("Access-Control-Allow-Methods", methods)
	w.Header().Set("Access-Control-Allow-Headers", "Content-Type, Authorization")
	if r.Method == http.MethodOptions {
		w.WriteHeader(http.StatusOK)
		return true
	}
	return false
}
