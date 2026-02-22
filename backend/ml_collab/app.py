#this file lies here for review
import os
import threading
import time
import torch
from fastapi import FastAPI, HTTPException
from fastapi.concurrency import run_in_threadpool
from pydantic import BaseModel, Field
from transformers import pipeline, AutoTokenizer, Pipeline
import nest_asyncio
import uvicorn
from supabase import create_client, Client
import requests
import json

# --- Summarization API ---
CHUNK_LENGTH = 1024
CHUNK_OVERLAP = 100
MAX_SUMMARY_LENGTH = 500
MIN_SUMMARY_LENGTH = 150
RECURSIVE_SUMMARIZATION = True

class SummarizationRequest(BaseModel):
    text: str = Field(..., min_length=1)

class SummarizationResponse(BaseModel):
    summary: str

try:
    device = 0 if torch.cuda.is_available() else -1
    MODEL_NAME = "facebook/bart-large-cnn"
    summarizer: Pipeline = pipeline("summarization", model=MODEL_NAME, device=device)
    tokenizer = AutoTokenizer.from_pretrained(MODEL_NAME)
    print(f"Model loaded successfully on device: {'GPU' if device == 0 else 'CPU'}")
except Exception as e:
    print(f"Failed to load model: {e}")
    summarizer = None
    tokenizer = None

app = FastAPI(title="Text Summarization API")

def process_summarization(text: str) -> str:
    if not text or not text.strip() or not tokenizer:
        return ""
    tokens = tokenizer.encode(text)
    text_token_len = len(tokens)
    if text_token_len <= CHUNK_LENGTH:
        effective_min = min(MIN_SUMMARY_LENGTH, text_token_len - 2)
        effective_max = min(MAX_SUMMARY_LENGTH, text_token_len - 1)
        if effective_min <= 0 or effective_min >= effective_max:
            return text
        try:
            summary_result = summarizer(text, max_length=effective_max, min_length=effective_min, do_sample=False)
            return summary_result[0]['summary_text'] if summary_result else ""
        except Exception:
            return ""
    summaries = []
    for i in range(0, len(tokens), CHUNK_LENGTH - CHUNK_OVERLAP):
        chunk_tokens = tokens[i:i + CHUNK_LENGTH]
        chunk_text = tokenizer.decode(chunk_tokens, skip_special_tokens=True)
        if chunk_text.strip():
            try:
                chunk_token_len = len(chunk_tokens)
                effective_min = min(int(MIN_SUMMARY_LENGTH * 0.8), chunk_token_len - 2)
                effective_max = min(int(MAX_SUMMARY_LENGTH * 0.8), chunk_token_len - 1)
                if effective_min <= 0 or effective_min >= effective_max:
                    continue
                chunk_summary = summarizer(chunk_text, max_length=effective_max, min_length=effective_min, do_sample=False)
                if chunk_summary:
                    summaries.append(chunk_summary[0]['summary_text'])
            except Exception:
                continue
    combined_summary = " ".join(summaries)
    if RECURSIVE_SUMMARIZATION and combined_summary.strip():
        return process_summarization(combined_summary)
    else:
        return combined_summary

@app.post("/summarize", response_model=SummarizationResponse)
async def summarize_text(request: SummarizationRequest):
    if not summarizer:
        raise HTTPException(status_code=503, detail="Summarization model is not available.")
    final_summary = await run_in_threadpool(process_summarization, request.text)
    return SummarizationResponse(summary=final_summary)

nest_asyncio.apply()
def run_app():
    uvicorn.run(app, host="0.0.0.0", port=9000)
threading.Thread(target=run_app, daemon=True).start()
time.sleep(5)  # Wait for server to start

# Start localtunnel and get public URL
from subprocess import Popen, PIPE
lt_proc = Popen(["lt", "--port", "9000"], stdout=PIPE, stderr=PIPE, text=True)
public_url = None
while not public_url:
    line = lt_proc.stdout.readline()
    if "your url is:" in line or "https://" in line:
        public_url = line.strip().split()[-1]
        print("Localtunnel public URL:", public_url)
        break

# --- Supabase Automation ---
SUPABASE_URL = "https://fhpiolkvgjplgxlhliok.supabase.co"
SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZocGlvbGt2Z2pwbGd4bGhsaW9rIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTc0MDA2NDQsImV4cCI6MjA3Mjk3NjY0NH0.T6We37kTvazFIogVqWHo4ogW9uRqtO8ub2zaFUa1Zgg"
SUMMARY_API_URL = public_url + "/summarize"

supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)

ocr_rows = supabase.table("ocr").select("*").eq("summary_generated", False).execute().data

for row in ocr_rows:
    f_uuid = row["f_uuid"]
    ocr_data = row["data"]
    print(f"[DEBUG] Processing f_uuid: {f_uuid}")
    print(f"[DEBUG] Raw OCR data: {ocr_data[:100]}..." if len(ocr_data) > 100 else f"[DEBUG] Raw OCR data: {ocr_data}")

    pages = None
    if ocr_data.strip().startswith("{"):
        try:
            ocr_json = json.loads(ocr_data)
            pages = ocr_json.get("pages", [])
            print(f"[DEBUG] Parsed {len(pages)} pages from OCR data.")
        except Exception as e:
            print(f"[ERROR] Could not parse OCR data for f_uuid {f_uuid}: {e}")
            continue
    else:
        # Treat plain text as a single page
        pages = [{
            "page_index": 0,
            "text": ocr_data,
            "avg_confidence": row.get("avg_confidence")
        }]
        print(f"[DEBUG] Treated OCR data as a single page.")

    page_summaries = []
    for page in pages:
        page_index = page.get("page_index")
        page_text = page.get("text", "")
        avg_confidence = page.get("avg_confidence", None)
        print(f"[DEBUG] Summarizing page {page_index} (confidence: {avg_confidence})")
        print(f"[DEBUG] Page text: {page_text[:100]}..." if len(page_text) > 100 else f"[DEBUG] Page text: {page_text}")

        response = requests.post(SUMMARY_API_URL, json={"text": page_text})
        print(f"[DEBUG] API response status: {response.status_code}")
        summary = response.json().get("summary", "")
        print(f"[DEBUG] Summary: {summary}")

        page_summaries.append({
            "page_index": page_index,
            "summary": summary,
            "avg_confidence": avg_confidence
        })

    print(f"[DEBUG] Inserting summary for f_uuid: {f_uuid}")
    supabase.table("summary").insert({
        "f_uuid": f_uuid,
        "summary": json.dumps(page_summaries)
    }).execute()

    print(f"[DEBUG] Marking summary_generated TRUE for ocr_uuid: {row['ocr_uuid']}")
    supabase.table("ocr").update({"summary_generated": True}).eq("ocr_uuid", row["ocr_uuid"]).execute()

print("JSON array summaries generated and tables updated.")













