-- SQL migrations for document processing results table
-- Run this in Supabase SQL Editor

CREATE TABLE IF NOT EXISTS document_processing_results (
    result_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    original_filename TEXT NOT NULL,
    original_size_bytes BIGINT,
    extracted_text TEXT,
    extracted_text_length INT,
    ocr_confidence FLOAT,
    summary TEXT,
    extraction_time_ms INT,
    summarization_time_ms INT,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE
);

-- Create indexes for fast querying
CREATE INDEX idx_document_results_user_id ON document_processing_results(user_id);
CREATE INDEX idx_document_results_created_at ON document_processing_results(created_at DESC);

-- Enable RLS for security
ALTER TABLE document_processing_results ENABLE ROW LEVEL SECURITY;

-- RLS Policy: users can only see their own results
CREATE POLICY document_results_user_policy
ON document_processing_results
FOR ALL
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);
