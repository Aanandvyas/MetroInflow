package utils

import (
	"strings"
)

// SplitTextIntoChunks splits text into chunks of roughly chunkSize words with overlap.
func SplitTextIntoChunks(text string, chunkSize int, overlap int) []string {
	words := strings.Fields(text)
	var chunks []string
	start := 0
	for start < len(words) {
		end := start + chunkSize
		if end > len(words) {
			end = len(words)
		}
		chunk := strings.Join(words[start:end], " ")
		chunks = append(chunks, chunk)
		start = end - overlap
		if start < 0 {
			start = 0
		}
		if start >= len(words) {
			break
		}
	}
	return chunks
}

// CountWords counts approximate words in a string
func CountWords(text string) int {
	return len(strings.Fields(text))
}

// CleanOCRText removes common OCR artifacts
func CleanOCRText(text string) string {
	text = strings.ReplaceAll(text, "\n", " ")
	text = strings.ReplaceAll(text, "\r", "")
	text = strings.TrimSpace(text)
	return text
}
