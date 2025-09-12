from fastapi import FastAPI
from pydantic import BaseModel
import uvicorn
# --- Application Setup ---
app_fastapi = FastAPI()
# --- FastAPI Summarization Endpoint ---
class SummarizeRequest(BaseModel):
    text: str
    prompt: str = ""

@app_fastapi.post("/summarize")
async def summarize_endpoint(req: SummarizeRequest):
    summary = summarize_large_document(req.text, req.prompt)
    return {"summary": summary}
import os
import requests
import time
from flask import Flask, render_template, request
from dotenv import load_dotenv
import config

# Load environment variables from .env file
load_dotenv()

# --- Application Setup ---
app = Flask(__name__)
HF_API_KEY = os.getenv("HF_API_KEY")
HEADERS = {"Authorization": f"Bearer {HF_API_KEY}"}

# --- Helper Functions ---

def query_huggingface_api(payload, retries=3, backoff_factor=2):
    """
    Sends a request to the Hugging Face API.
    Includes a timeout and a retry mechanism with exponential backoff for server errors.
    """
    attempt = 0
    while attempt < retries:
        try:
            # client-side timeout hai idhar
            response = requests.post(
                config.MODEL_API_URL, 
                headers=HEADERS, 
                json=payload,
                timeout=45 
            )

            # If the request is successful, process the response
            if response.status_code == 200:
                result = response.json()
                if isinstance(result, list) and result:
                    return result[0]['summary_text']
                else:
                    raise Exception(f"API returned an unexpected response format: {result}")

            #handling exceptions....
            elif response.status_code in [503, 504]:
                print(f"Server error {response.status_code} received. Retrying...")
                
            # For other errors, raise an exception immediately
            else:
                raise Exception(f"API request failed: {response.status_code} - {response.text}")

        except requests.exceptions.Timeout:
            print("Request timed out. Retrying...")
        except Exception as e:
            # Re-raise the exception if it's not a retryable one
            if attempt + 1 >= retries:
                raise e

        # If we are retrying, wait before the next attempt
        attempt += 1
        if attempt < retries:
            wait_time = backoff_factor ** attempt
            print(f"Waiting {wait_time} seconds before next retry...")
            time.sleep(wait_time)
            
    # If all retries fail, raise the final exception
    raise Exception("All API retries failed.")

# Bhai tuu pdh rha hai ye code ... damn  


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

# --- Flask Routes hai ye neeche---
@app.route('/', methods=['GET', 'POST'])
def index():
    if request.method == 'POST':
        document_text = request.form.get('document_text')
        custom_prompt = request.form.get('custom_prompt')
        summary = ""
        error = ""

        if not document_text or not document_text.strip():
            error = "Please paste some document text to summarize."
        elif not HF_API_KEY or not HF_API_KEY.startswith("hf_"):
            error = "Hugging Face API Key is not configured correctly. Please check your .env file.Ya fir bna lo agr banai nhi hai toh"
        else:
            try:
                summary = summarize_large_document(document_text, custom_prompt)
            except Exception as e:
                error = f"An error occurred: {str(e)}"
        
        return render_template('index.html', 
                               summary=summary, 
                               error=error,
                               original_text=document_text, 
                               prompt=custom_prompt)

    return render_template('index.html')


if __name__ == '__main__':
    import threading
    # Run Flask and FastAPI together for dev
    def run_flask():
        app.run(debug=True, port=5000)
    def run_fastapi():
        uvicorn.run(app_fastapi, host="0.0.0.0", port=9000)
    threading.Thread(target=run_flask).start()
    run_fastapi()