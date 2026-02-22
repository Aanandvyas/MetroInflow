// in the main.go file the API request is adjusted for FE convenience
package services

import (
	"bytes"
	"encoding/json"
	"io"
	"log"
	"mime/multipart"
	"net/http"
	"os"
)

func RunOCR(filePath string) (string, float64, error) {
	log.Println("[RunOCR] Opening file:", filePath)
	file, err := os.Open(filePath)
	if err != nil {
		log.Println("[RunOCR] Error opening file:", err)
		return "", 0, err
	}
	defer file.Close()

	var b bytes.Buffer
	w := multipart.NewWriter(&b)
	fw, err := w.CreateFormFile("file", filePath)
	if err != nil {
		log.Println("[RunOCR] Error creating form file:", err)
		return "", 0, err
	}
	_, err = io.Copy(fw, file)
	if err != nil {
		log.Println("[RunOCR] Error copying file to form:", err)
		return "", 0, err
	}
	w.Close()

	log.Println("[RunOCR] Sending POST request to OCR service")
	req, err := http.NewRequest("POST", "http://localhost:8000/ocr", &b)
	if err != nil {
		log.Println("[RunOCR] Error creating HTTP request:", err)
		return "", 0, err
	}
	req.Header.Set("Content-Type", w.FormDataContentType())

	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		log.Println("[RunOCR] Error sending request to OCR service:", err)
		return "", 0, err
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		log.Println("[RunOCR] OCR service returned non-200 status:", resp.Status)
		return "", 0, err
	}

	var result struct {
		Pages []struct {
			Text          string  `json:"text"`
			AvgConfidence float64 `json:"avg_confidence"`
		} `json:"pages"`
	}
	if err := json.NewDecoder(resp.Body).Decode(&result); err != nil {
		log.Println("[RunOCR] Error decoding OCR response:", err)
		return "", 0, err
	}

	if len(result.Pages) == 0 {
		log.Println("[RunOCR] No pages returned from OCR service")
		return "", 0, nil
	}

	// Combine all page texts and average the confidences
	var allText string
	var sumConf float64
	for _, page := range result.Pages {
		allText += page.Text + "\n"
		sumConf += page.AvgConfidence
	}
	avgConf := sumConf / float64(len(result.Pages))

	log.Println("[RunOCR] OCR completed successfully")
	return allText, avgConf, nil
}
