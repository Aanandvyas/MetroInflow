// check for the py summary model API endpoint
package services

import (
	"bytes"
	"encoding/json"
	"log"
	"net/http"
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
	req, err := http.NewRequest("POST", "http://localhost:9000/summarize", bytes.NewBuffer(body))
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
		return "", err
	}
	var result struct {
		Summary string `json:"summary"`
	}
	if err := json.NewDecoder(resp.Body).Decode(&result); err != nil {
		return "", err
	}
	return result.Summary, nil
}
