import uvicorn
from fastapi import FastAPI, File, UploadFile, HTTPException
from starlette.responses import JSONResponse
from paddleocr import PaddleOCR
from PIL import Image
import io
import numpy as np
import fitz  # PyMuPDF

app = FastAPI(title="OCR Service")

# Initialize OCR once
ocr = PaddleOCR(use_angle_cls=True, lang='en')


def run_ocr_on_image(img: Image.Image):
    """Run OCR on an image and return combined text + avg confidence (PaddleOCR document mode)."""
    arr = np.array(img)
    result = ocr.ocr(arr)  # use default doc mode

    # For production, use logging instead of print if needed

    texts = []
    confidences = []

    # PaddleOCR document mode returns a list of dicts
    if isinstance(result, list):
        for item in result:
            rec_texts = item.get("rec_texts", [])
            rec_scores = item.get("rec_scores", [])
            for t, c in zip(rec_texts, rec_scores):
                t = t.strip()
                if t:
                    texts.append(t)
                    confidences.append(float(c))

    page_text = " ".join(texts)
    avg_conf = sum(confidences)/len(confidences) if confidences else 0.0
    return page_text, avg_conf



@app.get("/health")
async def health():
    return {"status": "ok"}


@app.post("/ocr")
async def ocr_endpoint(file: UploadFile = File(...)):
    content = await file.read()
    if not content:
        raise HTTPException(status_code=400, detail="empty file")

    filename = file.filename.lower()

    try:
        if filename.endswith(".pdf"):
            pdf_document = fitz.open(stream=content, filetype="pdf")
            pages_output = []

            for page_num in range(len(pdf_document)):
                page = pdf_document[page_num]
                pix = page.get_pixmap(dpi=150)  # adjust DPI
                img = Image.frombytes("RGB", [pix.width, pix.height], pix.samples)

                text, avg_conf = run_ocr_on_image(img)
                pages_output.append({
                    "page_index": page_num,
                    "text": text,
                    "avg_confidence": avg_conf
                })

            return JSONResponse({"pages": pages_output})

        else:
            img = Image.open(io.BytesIO(content)).convert("RGB")
            text, avg_conf = run_ocr_on_image(img)
            return JSONResponse({
                "pages": [
                    {"page_index": 0, "text": text, "avg_confidence": avg_conf}
                ]
            })

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)
