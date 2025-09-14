from fastapi import FastAPI, Request, Form
from fastapi.responses import HTMLResponse
from fastapi.templating import Jinja2Templates
from pydantic import BaseModel
import uvicorn
import os
import requests
import time
from dotenv import load_dotenv
import config

# --- Application Setup ---
app = FastAPI()
templates = Jinja2Templates(directory="templates")

class SummarizeRequest(BaseModel):
    text: str
    prompt: str = ""

load_dotenv()
HF_API_KEY = os.getenv("HF_API_KEY")
HEADERS = {"Authorization": f"Bearer {HF_API_KEY}"}

def query_huggingface_api(payload, retries=3, backoff_factor=2):
    attempt = 0
    while attempt < retries:
        try:
            response = requests.post(
                config.MODEL_API_URL, 
                headers=HEADERS, 
                json=payload,
                timeout=45 
            )
            if response.status_code == 200:
                result = response.json()
                if isinstance(result, list) and result and 'summary_text' in result[0]:
                    return result[0]['summary_text']
                elif isinstance(result, dict) and 'summary_text' in result:
                    return result['summary_text']
                else:
                    raise Exception(f"API returned an unexpected response format: {result}")
            elif response.status_code in [503, 504]:
                print(f"Server error {response.status_code} received. Retrying...")
            else:
                raise Exception(f"API request failed: {response.status_code} - {response.text}")
        except requests.exceptions.Timeout:
            print("Request timed out. Retrying...")
        except Exception as e:
            if attempt + 1 >= retries:
                raise e
        attempt += 1
        if attempt < retries:
            wait_time = backoff_factor ** attempt
            print(f"Waiting {wait_time} seconds before next retry...")
            time.sleep(wait_time)
    raise Exception("All API retries failed.")

def chunk_text(text, max_length):
    words = text.replace('\n', ' ').split()
    chunks = []
    current_chunk = []
    current_length = 0
    for word in words:
        if current_length + len(word) + 1 > max_length:
            chunks.append(" ".join(current_chunk))
            current_chunk = [word]
            current_length = len(word)
        else:
            current_chunk.append(word)
            current_length += len(word) + 1
    if current_chunk:
        chunks.append(" ".join(current_chunk))
    return chunks

def summarize_large_document(text, prompt):
    cleaned_text = text.strip()
    if len(cleaned_text) < config.MIN_TEXT_LENGTH:
        return "Input text is too short to summarize."
    chunks = chunk_text(cleaned_text, config.MAX_CHUNK_CHAR_LENGTH)
    chunk_summaries = []
    print(f"Splitting document into {len(chunks)} chunks.")
    for i, chunk in enumerate(chunks):
        print(f"Summarizing chunk {i+1}/{len(chunks)}...")
        input_text = f"{prompt}\n\n{chunk}"
        try:
            summary = query_huggingface_api({
                "inputs": input_text,
                "parameters": config.chunk_summary_params
            })
            chunk_summaries.append(summary)
        except Exception as e:
            print(f"Error summarizing chunk {i+1}: {e}")
            chunk_summaries.append("[Summary for this section failed.]")
    if len(chunk_summaries) <= 1:
        return "".join(chunk_summaries) if chunk_summaries else "Could not generate summary."
    combined_summary_text = "\n".join(chunk_summaries)
    print("Creating final summary from combined chunk summaries...")
    final_prompt = f"Create a cohesive final summary from the following points:\n\n{combined_summary_text}"
    final_summary = query_huggingface_api({
        "inputs": final_prompt,
        "parameters": config.final_summary_params
    })
    return final_summary

@app.get("/", response_class=HTMLResponse)
async def index(request: Request):
    return templates.TemplateResponse("index.html", {"request": request})

@app.post("/", response_class=HTMLResponse)
async def summarize(
    request: Request,
    document_text: str = Form(...),
    custom_prompt: str = Form("")
):
    summary = ""
    error = ""
    if not document_text or not document_text.strip():
        error = "Please paste some document text to summarize."
    elif not HF_API_KEY or not HF_API_KEY.startswith("hf_"):
        error = "Hugging Face API Key is not configured correctly. Please check your .env file."
    else:
        try:
            summary = summarize_large_document(document_text, custom_prompt)
        except Exception as e:
            error = f"An error occurred: {str(e)}"
    return templates.TemplateResponse(
        "index.html",
        {
            "request": request,
            "summary": summary,
            "error": error,
            "original_text": document_text,
            "prompt": custom_prompt
        }
    )

@app.post("/summarize")
async def summarize_api(req: SummarizeRequest):
    summary = summarize_large_document(req.text, req.prompt)
    return {"summary": summary}

if __name__ == "__main__":
    uvicorn.run("app_fastapi:app", host="0.0.0.0", port=9000, reload=True)