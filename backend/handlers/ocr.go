package handlers

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"mime/multipart"
	"net/http"

	"backend/models"
)

// RunOCR forwards the file to the Python OCR service (no disk I/O).
func RunOCR(filename string, fileContent []byte, pythonOCRURL string) (*models.OCRResponse, error) {
	body := &bytes.Buffer{}
	writer := multipart.NewWriter(body)

	part, err := writer.CreateFormFile("file", filename)
	if err != nil {
		return nil, err
	}

	_, err = part.Write(fileContent)
	if err != nil {
		return nil, err
	}
	writer.Close()

	req, err := http.NewRequest("POST", pythonOCRURL, body)
	if err != nil {
		return nil, err
	}
	req.Header.Set("Content-Type", writer.FormDataContentType())

	client := &http.Client{}
	resp, err := client.Do(req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		b, _ := io.ReadAll(resp.Body)
		return nil, fmt.Errorf("python service returned %d: %s", resp.StatusCode, string(b))
	}

	var ocrResp models.OCRResponse
	if err := json.NewDecoder(resp.Body).Decode(&ocrResp); err != nil {
		return nil, fmt.Errorf("failed to decode response: %v", err)
	}

	return &ocrResp, nil
}
