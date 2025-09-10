package models

// Page represents OCR output per page
type Page struct {
	PageIndex     int     `json:"page_index"`
	Text          string  `json:"text"`
	AvgConfidence float64 `json:"avg_confidence"`
}

// OCRResponse matches the Python OCR service response
type OCRResponse struct {
	Pages []Page `json:"pages"`
}
