package services

import (
	"backend/utils"
	"strings"
)

func CallHFSummarizerWithChunking(text string) (string, error) {
	cleanText := utils.CleanOCRText(text)
	maxWordsPerChunk := 700
	overlap := 50

	chunks := utils.SplitTextIntoChunks(cleanText, maxWordsPerChunk, overlap)
	var chunkSummaries []string

	for _, chunk := range chunks {
		summary, err := CallHFSummarizer(chunk)
		if err != nil {
			return "", err
		}
		chunkSummaries = append(chunkSummaries, summary)
	}

	// If multiple chunks, summarize the concatenation of summaries
	if len(chunkSummaries) > 1 {
		finalInput := strings.Join(chunkSummaries, " ")
		finalSummary, err := CallHFSummarizer(finalInput)
		if err != nil {
			return "", err
		}
		return finalSummary, nil
	}

	return chunkSummaries[0], nil
}

// Stub implementation for CallHFSummarizer
func CallHFSummarizer(text string) (string, error) {
	// TODO: Replace with actual HuggingFace summarizer call
	return "Summary: " + text, nil
}
