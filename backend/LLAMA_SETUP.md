# Local Llama.cpp LLM Integration

This document describes how to set up and use the local Llama 3.1 8B Q4_K_M model with your MetroInflow backend.

## Architecture

```
Frontend/Go Backend
        ↓
POST /v1/llm/generate or /v1/llm/summarize
        ↓
Local HTTP Server (llama-server on port 8080)
        ↓
Llama.cpp with Metal GPU acceleration
        ↓
GGUF Q4_K_M Model (runs on M4 Mac)
```

## Prerequisites

✓ llama.cpp built with Metal acceleration (`~/llama.cpp/build/`)
✓ Startup script ready (`~/llama-server-start.sh`)

## Step 1: Start the Llama Server

In a terminal, run:

```bash
~/llama-server-start.sh
```

This starts an HTTP server on `http://localhost:8080` with the 1B Instruct model by default.

**To use the 8B Q4_K_M model instead, set environment variables before running:**

```bash
export LLAMA_REPO="hugging-quants/Llama-3.1-8B-Instruct-Q4_K_M-GGUF"
export LLAMA_FILE="llama-3.1-8b-instruct-q4_k_m.gguf"
export LLAMA_THREADS=6  # Use more threads for 8B (M4 has 10 cores)
~/llama-server-start.sh
```

Expected output:
```
Loading model...
For more info visit http://localhost:8080/info
```

## Step 2: Start Your Backend

In another terminal, run your Go backend:

```bash
cd ~/workspace/projects/MetroInflow/backend
go run main.go
```

The backend will now have two new endpoints available:
- `POST /v1/llm/generate` - Generate text using the model
- `POST /v1/llm/summarize` - Summarize documents

## API Usage

### Generate Text

**Request:**
```bash
curl -X POST http://localhost:3000/v1/llm/generate \
  -H "Content-Type: application/json" \
  -d '{
    "prompt": "Once upon a time",
    "n": 100,
    "n_ctx": 2048
  }'
```

**Response:**
```json
{
  "content": "...generated text...",
  "tokens_generated": 92
}
```

### Summarize Document

**Request:**
```bash
curl -X POST http://localhost:3000/v1/llm/summarize \
  -H "Content-Type: application/json" \
  -d '{
    "document_content": "Long document text here...",
    "max_length": 256
  }'
```

**Response:**
```json
{
  "summary": "...summary text..."
}
```

## Configuration

Edit `~/llama-server-start.sh` to customize:

- **LLAMA_REPO**: Hugging Face model repository
- **LLAMA_FILE**: Model file name
- **LLAMA_PORT**: HTTP server port (default: 8080)
- **LLAMA_THREADS**: Number of CPU threads to use (default: 4, max ~10 for M4)
- **LLAMA_CONTEXT**: Context window size (default: 2048)

### Recommended Settings for M4 Mac

For **1B Instruct** (fast, ~66 t/s generation):
```bash
LLAMA_THREADS=4
LLAMA_CONTEXT=2048
```

For **8B Q4_K_M** (slower but better quality, ~30 t/s generation estimated):
```bash
LLAMA_THREADS=8
LLAMA_CONTEXT=2048
```

## Models to Try

### Fast (1B - for testing)
```bash
LLAMA_REPO=hugging-quants/Llama-3.2-1B-Instruct-Q8_0-GGUF
LLAMA_FILE=llama-3.2-1b-instruct-q8_0.gguf
```

### High Quality (8B Q4_K_M - your original choice)
```bash
LLAMA_REPO=hugging-quants/Llama-3.1-8B-Instruct-Q4_K_M-GGUF
LLAMA_FILE=llama-3.1-8b-instruct-q4_k_m.gguf
```

### Ultra Fast (3B)
```bash
LLAMA_REPO=hugging-quants/Llama-3.2-3B-Instruct-Q8_0-GGUF
LLAMA_FILE=llama-3.2-3b-instruct-q8_0.gguf
```

## Troubleshooting

**"Failed to connect to LLM server"**
- Ensure `~/llama-server-start.sh` is running
- Check that the server is listening on port 8080: `lsof -i :8080`

**Slow inference on 8B model**
- Reduce `LLAMA_THREADS` to free up resources
- Reduce `LLAMA_CONTEXT` to 1024 or 512
- Switch to a smaller model (3B or 1B) for testing

**Model download hangs**
- First run takes time to download from Hugging Face (~1-6 GB depending on model)
- On subsequent runs, the model is cached and boots instantly

**Metal acceleration not working**
- Rebuild llama.cpp with Metal: `cd ~/llama.cpp/build && cmake --build . -j4`
- Verify Metal is enabled in output: should see "GGML_METAL" during build

## Backend Integration Code

The Go handlers in `backend/handlers/llm.go` forward requests to the local server:

1. **LLMGenerateHandler**: Accepts a prompt and returns generated text
2. **LLMSummarizeHandler**: Accepts document content and returns a summary

Both handlers:
- Set appropriate CORS headers
- Validate input
- Forward to `http://localhost:8080/completion`
- Parse and return the llama-server response

## Notes

- The llama-server binary supports all llama.cpp options; see `llama-server --help`
- For production use, consider running the server in a systemd service or Docker container
- Metal GPU acceleration requires macOS 12.3+; your M4 Mac supports it fully
- Generated responses may vary on each run due to temperature settings

## Next Steps

1. Start the llama server: `~/llama-server-start.sh`
2. Start your backend: `go run main.go` in the backend directory
3. Test the API with curl examples above
4. Integrate into your frontend via the Go endpoints
5. Tune `LLAMA_THREADS` and `LLAMA_CONTEXT` for your use case

Enjoy local LLM inference!
