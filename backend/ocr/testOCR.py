#lies here for review(dk y i had a need for it)
import numpy as np
import fitz  # PyMuPDF
import io
import sys
from paddleocr import PaddleOCR
from PIL import Image
import os

def run_ocr(ocr, img, label=""):
    result = ocr.ocr(img)
    print(f"\n--- OCR Results ({label}) ---")
    if not result or not result[0]:
        print("No text found")
        return
    for line in result[0]:
        try:
            box = line[0]
            (text, conf) = line[1]
            print(f"Text: {text} | Confidence: {conf:.2f}")
        except IndexError:
            # This handles cases where the OCR output is malformed
            continue

def main(filepath):
    # Check if the file exists
    if not os.path.exists(filepath):
        print(f"Error: File not found at '{filepath}'")
        sys.exit(1)

    # Initialize OCR engines
    ocr_en = PaddleOCR(use_angle_cls=True, lang="en")
    try:
        ocr_ml = PaddleOCR(use_angle_cls=True, lang="ml")
    except Exception as e:
        print(f"Warning: Could not initialize Malayalam OCR. Error: {e}")
        ocr_ml = None
    ocr_multi = PaddleOCR(use_angle_cls=True, lang="multi")

    # Load and process file
    if filepath.lower().endswith(".pdf"):
        doc = fitz.open(filepath)
        for i, page in enumerate(doc):
            print(f"\n--- Processing Page {i+1} ---")
            pix = page.get_pixmap(dpi=150)
            img = Image.frombytes("RGB", [pix.width, pix.height], pix.samples)
            run_ocr(ocr_en, img, label="English")
            if ocr_ml:
                run_ocr(ocr_ml, img, label="Malayalam")
            run_ocr(ocr_multi, img, label="Multilingual")
    else:
        img = Image.open(filepath).convert("RGB")
        run_ocr(ocr_en, img, label="English")
        if ocr_ml:
            run_ocr(ocr_ml, img, label="Malayalam")
        run_ocr(ocr_multi, img, label="Multilingual")

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: python test_ocr_langs.py <file.pdf|file.jpg>")
        sys.exit(1)
    main(sys.argv[1])