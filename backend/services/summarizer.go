// check for the py summary model API endpoint
package services

import (
	"bytes"
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"os"
	"strings"
)

func RunSummarizer(text string) (string, error) {
	payload := map[string]string{
		"text":   text,
		"prompt": "",
	}
	body, err := json.Marshal(payload)
	if err != nil {
		return "", err
	}
	summarizerURL := strings.TrimSpace(os.Getenv("SUMMARY_SERVICE_URL"))
	if summarizerURL == "" {
		summarizerURL = "http://127.0.0.1:9000/summarize"
	}
	summarizerURL = strings.Replace(summarizerURL, "://localhost", "://127.0.0.1", 1)
	if !strings.HasSuffix(strings.TrimRight(summarizerURL, "/"), "/summarize") {
		summarizerURL = strings.TrimRight(summarizerURL, "/") + "/summarize"
	}

	req, err := http.NewRequest("POST", summarizerURL, bytes.NewBuffer(body))
	if err != nil {
		return "", err
	}
	req.Header.Set("Content-Type", "application/json")
	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		return "", err
	}
	defer resp.Body.Close()
	if resp.StatusCode != http.StatusOK {
		log.Println("[RunSummarizer] Non-200 response:", resp.Status)
		return "", fmt.Errorf("summarizer returned non-200 status: %s", resp.Status)
	}
	var result struct {
		Summary string `json:"summary"`
	}
	if err := json.NewDecoder(resp.Body).Decode(&result); err != nil {
		return "", err
	}
	return result.Summary, nil
}
