package handlers

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"os"
	"time"
)

func llmCompletionURL() string {
	url := os.Getenv("LLM_COMPLETION_URL")
	if url == "" {
		return "http://localhost:8081/completion"
	}
	return url
}

// LLMGenerateRequest represents a request to the LLM service
type LLMGenerateRequest struct {
	Prompt string `json:"prompt"`
	N      int    `json:"n"`     // Number of tokens to generate (default: 128)
	NCtx   int    `json:"n_ctx"` // Context window (default: 2048)
}

// LLMGenerateResponse represents the response from the LLM service
type LLMGenerateResponse struct {
	Content string `json:"content"`
	Tokens  int    `json:"tokens_generated"`
}

// LLMSummarizeRequest represents a request to summarize document content
type LLMSummarizeRequest struct {
	DocumentContent string `json:"document_content"`
	MaxLength       int    `json:"max_length"` // Max tokens for summary (default: 256)
}

// LLMSummarizeResponse represents the summarization response
type LLMSummarizeResponse struct {
	Summary string `json:"summary"`
}

// LLMGenerateHandler proxies requests to the local llama.cpp server
// POST /v1/llm/generate
// Request: { "prompt": "...", "n": 128, "n_ctx": 2048 }
// Response: { "content": "...", "tokens_generated": 42 }
func LLMGenerateHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	var req LLMGenerateRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, fmt.Sprintf("Invalid request: %v", err), http.StatusBadRequest)
		return
	}

	if req.Prompt == "" {
		http.Error(w, "Prompt is required", http.StatusBadRequest)
		return
	}

	// Set defaults
	if req.N == 0 {
		req.N = 128
	}
	if req.NCtx == 0 {
		req.NCtx = 2048
	}

	llmServerURL := llmCompletionURL()
	payload := map[string]interface{}{
		"prompt":    req.Prompt,
		"n_predict": req.N,
		"n_ctx":     req.NCtx,
	}

	body, err := json.Marshal(payload)
	if err != nil {
		http.Error(w, fmt.Sprintf("Error encoding request: %v", err), http.StatusInternalServerError)
		return
	}

	client := &http.Client{Timeout: 45 * time.Second}
	reqHTTP, err := http.NewRequest(http.MethodPost, llmServerURL, bytes.NewReader(body))
	if err != nil {
		http.Error(w, fmt.Sprintf("Failed to build request: %v", err), http.StatusInternalServerError)
		return
	}
	reqHTTP.Header.Set("Content-Type", "application/json")

	resp, err := client.Do(reqHTTP)
	if err != nil {
		http.Error(w, fmt.Sprintf("Failed to connect to LLM server: %v", err), http.StatusServiceUnavailable)
		return
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		respBody, _ := io.ReadAll(resp.Body)
		http.Error(w, fmt.Sprintf("LLM server error: %s", string(respBody)), resp.StatusCode)
		return
	}

	// Parse response from llama-server
	var llmResp map[string]interface{}
	if err := json.NewDecoder(resp.Body).Decode(&llmResp); err != nil {
		http.Error(w, fmt.Sprintf("Error decoding LLM response: %v", err), http.StatusInternalServerError)
		return
	}

	// Extract content and token count
	content, _ := llmResp["content"].(string)
	tokens := 0
	if tokCount, ok := llmResp["tokens_predicted"].(float64); ok {
		tokens = int(tokCount)
	}

	result := LLMGenerateResponse{
		Content: content,
		Tokens:  tokens,
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(result)
}

// LLMSummarizeHandler summarizes document content using the local LLM
// POST /v1/llm/summarize
// Request: { "document_content": "...", "max_length": 256 }
// Response: { "summary": "..." }
func LLMSummarizeHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	var req LLMSummarizeRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, fmt.Sprintf("Invalid request: %v", err), http.StatusBadRequest)
		return
	}

	if req.DocumentContent == "" {
		http.Error(w, "Document content is required", http.StatusBadRequest)
		return
	}

	// Set default summary length
	if req.MaxLength == 0 {
		req.MaxLength = 256
	}

	// Construct a prompt for summarization
	prompt := fmt.Sprintf("Please summarize the following document concisely in %d tokens or less:\n\n%s\n\nSummary:",
		req.MaxLength, req.DocumentContent)

	// Call the LLM via our generate handler
	llmServerURL := llmCompletionURL()
	payload := map[string]interface{}{
		"prompt":      prompt,
		"n_predict":   req.MaxLength,
		"n_ctx":       2048,
		"temperature": 0.3, // Lower temperature for more focused summaries
	}

	body, err := json.Marshal(payload)
	if err != nil {
		http.Error(w, fmt.Sprintf("Error encoding request: %v", err), http.StatusInternalServerError)
		return
	}

	client := &http.Client{Timeout: 45 * time.Second}
	reqHTTP, err := http.NewRequest(http.MethodPost, llmServerURL, bytes.NewReader(body))
	if err != nil {
		http.Error(w, fmt.Sprintf("Failed to build request: %v", err), http.StatusInternalServerError)
		return
	}
	reqHTTP.Header.Set("Content-Type", "application/json")

	resp, err := client.Do(reqHTTP)
	if err != nil {
		http.Error(w, fmt.Sprintf("Failed to connect to LLM server: %v", err), http.StatusServiceUnavailable)
		return
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		respBody, _ := io.ReadAll(resp.Body)
		http.Error(w, fmt.Sprintf("LLM server error: %s", string(respBody)), resp.StatusCode)
		return
	}

	// Parse response from llama-server
	var llmResp map[string]interface{}
	if err := json.NewDecoder(resp.Body).Decode(&llmResp); err != nil {
		http.Error(w, fmt.Sprintf("Error decoding LLM response: %v", err), http.StatusInternalServerError)
		return
	}

	// Extract summary
	summary, _ := llmResp["content"].(string)

	result := LLMSummarizeResponse{
		Summary: summary,
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(result)
}
