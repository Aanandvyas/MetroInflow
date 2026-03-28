package handlers

import (
	"net/http"
	"net/http/httptest"
	"testing"
)

func TestCombineFirst10Pages(t *testing.T) {
	ocrResp := map[string]interface{}{
		"pages": []interface{}{
			map[string]interface{}{"text": "page1", "avg_confidence": 0.8, "error": nil},
			map[string]interface{}{"text": "page2", "avg_confidence": 0.9, "error": nil},
			map[string]interface{}{"text": "", "avg_confidence": 0.7, "error": "decode error"},
		},
	}

	text, conf, count := combineFirst10Pages(ocrResp)
	if text != "page1 page2" {
		t.Fatalf("unexpected text: %q", text)
	}
	if count != 3 {
		t.Fatalf("unexpected page count: %d", count)
	}
	expected := 0.85
	if conf < expected-0.0001 || conf > expected+0.0001 {
		t.Fatalf("unexpected confidence: %.4f", conf)
	}
}

func TestCombineFirst10Pages_LimitsToTen(t *testing.T) {
	pages := make([]interface{}, 0, 12)
	for i := 0; i < 12; i++ {
		pages = append(pages, map[string]interface{}{"text": "x", "avg_confidence": 1.0, "error": nil})
	}

	text, _, count := combineFirst10Pages(map[string]interface{}{"pages": pages})
	if count != 10 {
		t.Fatalf("expected 10 pages, got %d", count)
	}
	if len(text) == 0 {
		t.Fatal("expected non-empty text")
	}
}

func TestProcessFirst10PagesStatusHandler_MissingID(t *testing.T) {
	req := httptest.NewRequest(http.MethodGet, "/v1/documents/process-first-10-pages/status", nil)
	rr := httptest.NewRecorder()

	ProcessFirst10PagesStatusHandler(rr, req)

	if rr.Code != http.StatusBadRequest {
		t.Fatalf("expected %d, got %d", http.StatusBadRequest, rr.Code)
	}
}

func TestProcessFirst10PagesStatusHandler_JobNotFound(t *testing.T) {
	req := httptest.NewRequest(http.MethodGet, "/v1/documents/process-first-10-pages/status?id=missing", nil)
	rr := httptest.NewRecorder()

	ProcessFirst10PagesStatusHandler(rr, req)

	if rr.Code != http.StatusNotFound {
		t.Fatalf("expected %d, got %d", http.StatusNotFound, rr.Code)
	}
}
