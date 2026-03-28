package handlers

import "bytes"

// isLikelyPDF detects a PDF signature within the first 1KB.
// Some generators prepend bytes before the %PDF header.
func isLikelyPDF(data []byte) bool {
	if len(data) == 0 {
		return false
	}
	searchLen := len(data)
	if searchLen > 1024 {
		searchLen = 1024
	}
	return bytes.Contains(data[:searchLen], []byte("%PDF"))
}
