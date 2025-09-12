package services

import (
	"log"
	"os/exec"
)

func RunOCR(filePath string) (string, error) {
	// Example using PaddleOCR CLI
	cmd := exec.Command("paddleocr", "--image_dir", filePath, "--lang", "en", "--use_angle_cls", "false")
	out, err := cmd.CombinedOutput()
	if err != nil {
		log.Println("OCR Error:", err)
		return "", err
	}
	return string(out), nil
}
