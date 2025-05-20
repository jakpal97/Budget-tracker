
import sys
import json
import easyocr
import numpy as np
from PIL import Image
import io

def perform_ocr(image_path, languages=['pl', 'en']):
    try:
        # Wczytanie obrazu
        reader = easyocr.Reader(languages, gpu=False) 
        
        # Wykonanie OCR
        results = reader.readtext(image_path)
        
        # Formatowanie wyników
        text_results = []
        full_text = ""
        
        for (bbox, text, prob) in results:
            text_results.append({
                "text": text,
                "confidence": prob,
                "bbox": bbox
            })
            full_text += text + " "
        
        # Zwracamy wyniki w JSON
        return json.dumps({
            "success": True,
            "full_text": full_text,
            "detailed_results": text_results,
            "average_confidence": sum(r["confidence"] for r in text_results) / len(text_results) if text_results else 0
        })
    except Exception as e:
        return json.dumps({
            "success": False,
            "error": str(e)
        })

if __name__ == "__main__":
    if len(sys.argv) > 1:
        image_path = sys.argv[1]
        languages = ['pl', 'en']
        if len(sys.argv) > 2:
            languages = sys.argv[2].split(',')
        
        result = perform_ocr(image_path, languages)
        print(result)
    else:
        print(json.dumps({"success": False, "error": "Nie podano ścieżki do obrazu"}))
