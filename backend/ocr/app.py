from fastapi import FastAPI, File, UploadFile, HTTPException
from starlette.responses import JSONResponse
from paddleocr import PaddleOCR
import numpy as np
from typing import List
from PIL import Image
import io
import uvicorn

app = FastAPI(title="PaddleOCR Service")

# Initialize once (this can be slow the first time)
ocr = PaddleOCR(use_angle_cls=True, lang='en')  # adjust lang as needed

@app.get("/health")
async def health():
    return {"status": "ok"}

@app.post("/ocr")
async def ocr_endpoint(image: UploadFile = File(...)):
    content = await image.read()
    if not content:
        raise HTTPException(status_code=400, detail="empty file")
    try:
        img = Image.open(io.BytesIO(content)).convert("RGB")
        arr = np.array(img)

        result = ocr.ocr(arr)

        if not result or not result[0]:
            # No text found
            return JSONResponse({"lines": []})

        lines = []
        for line in result[0]:  # safe: loop only if list has items
            try:
                box = [[int(x), int(y)] for x, y in line[0]]
                text, conf = line[1]
                lines.append({
                    "text": text,
                    "confidence": float(conf),
                    "box": box
                })
            except Exception as e:
                # Skip malformed line instead of crashing
                continue
        
        result = ocr.ocr(arr)
        print("RAW OCR RESULT:", result)
        return JSONResponse({"lines": lines})
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))



if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)
