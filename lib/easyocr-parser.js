import sharp from 'sharp'
import { PythonShell } from 'python-shell'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import { dirname } from 'path'

// Sprawdź, czy jesteśmy w środowisku produkcyjnym (Vercel)
const isProduction = process.env.NODE_ENV === 'production' || process.env.VERCEL === '1'

// Tworzymy folder do tymczasowych plików Python
let pythonScriptsPath = '/tmp/python'
let currentDirPath = ''

// W środowisku deweloperskim używamy lokalnych ścieżek
if (!isProduction) {
	try {
		const currentFilePath = fileURLToPath(import.meta.url)
		currentDirPath = dirname(currentFilePath)
		pythonScriptsPath = path.join(currentDirPath, '../python')
	} catch (error) {
		console.warn('Nie można uzyskać ścieżki do bieżącego pliku:', error)
	}
}

// Upewniamy się, że folder na skrypty Pythona istnieje
try {
	if (!fs.existsSync(pythonScriptsPath)) {
		fs.mkdirSync(pythonScriptsPath, { recursive: true })
	}
} catch (error) {
	console.warn('Nie można utworzyć folderu dla skryptów Pythona:', error)
}

// Tworzymy skrypt Python dla EasyOCR
const easyOcrScriptPath = path.join(pythonScriptsPath, 'easyocr_script.py')
const easyOcrScript = `
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
`

// Zapisujemy skrypt Python
try {
	fs.writeFileSync(easyOcrScriptPath, easyOcrScript)
} catch (error) {
	console.warn('Nie można zapisać skryptu Python:', error)
}

// Funkcja do przetwarzania obrazu przed OCR
async function preprocessImage(imagePath) {
	try {
		// Sprawdzamy rozmiar obrazu
		const metadata = await sharp(imagePath).metadata()
		console.log('Oryginalny rozmiar obrazu:', metadata)

		// Tworzymy kilka wariantów przetworzonych obrazów dla lepszych wyników
		// 1. Obraz z podwyższonym kontrastem
		const highContrastImage = await sharp(imagePath)
			.resize({
				width: 2400, // Zwiększamy rozdzielczość
				withoutEnlargement: false,
				fit: 'inside',
			})
			.sharpen({ sigma: 2.0 })
			.normalize()
			// Ważne: gamma musi być między 1.0 a 3.0
			.gamma(1.5) // Bezpieczna wartość gamma
			.toBuffer()

		// 2. Czarno-biały obraz
		const bwImage = await sharp(imagePath)
			.resize({
				width: 2400,
				withoutEnlargement: false,
				fit: 'inside',
			})
			.grayscale()
			.sharpen({ sigma: 1.8 })
			.normalize()
			.threshold(128) // Czarno-biały
			.toBuffer()

		// 3. Wyostrzony oryginalny obraz
		const originalEnhanced = await sharp(imagePath)
			.resize({
				width: 2000,
				fit: 'inside',
				withoutEnlargement: false,
			})
			.sharpen()
			.toBuffer()

		// Zapisujemy przetworzone obrazy jako pliki tymczasowe
		const tempDir = path.join(pythonScriptsPath, 'temp')
		try {
			if (!fs.existsSync(tempDir)) {
				fs.mkdirSync(tempDir, { recursive: true })
			}
		} catch (error) {
			console.warn('Nie można utworzyć folderu tymczasowego:', error)
		}

		const highContrastPath = path.join(tempDir, `high_contrast_${Date.now()}.jpg`)
		const bwPath = path.join(tempDir, `bw_${Date.now()}.jpg`)
		const originalPath = path.join(tempDir, `original_${Date.now()}.jpg`)

		await Promise.all([
			sharp(highContrastImage).toFile(highContrastPath),
			sharp(bwImage).toFile(bwPath),
			sharp(originalEnhanced).toFile(originalPath),
		])

		console.log('Obrazy przetworzone i zapisane jako pliki tymczasowe')
		return {
			highContrast: highContrastPath,
			bw: bwPath,
			original: originalPath,
		}
	} catch (error) {
		console.error('Błąd podczas przetwarzania obrazu:', error)
		throw new Error(`Błąd przetwarzania obrazu: ${error.message}`)
	}
}

// Funkcja do wykonywania OCR za pomocą EasyOCR
export async function performEasyOCR(imageData) {
	try {
		console.log('Rozpoczynanie preprocessingu obrazu dla EasyOCR...')
		const processedImages = await preprocessImage(imageData)
		console.log('Preprocessing zakończony, uruchamiam EasyOCR...')

		// Wykonujemy OCR dla każdego wariantu obrazu
		const ocrPromises = Object.values(processedImages).map(imagePath => {
			return new Promise((resolve, reject) => {
				const options = {
					mode: 'text',
					pythonPath: 'python', // Zakładamy, że Python jest zainstalowany i dostępny w PATH
					pythonOptions: ['-u'], // Unbuffered output
					scriptPath: pythonScriptsPath,
					args: [imagePath, 'pl,en'], // Języki: polski, angielski
				}

				PythonShell.run('easyocr_script.py', options)
					.then(results => {
						if (results && results.length > 0) {
							try {
								const result = JSON.parse(results[0])
								resolve(result)
							} catch (e) {
								console.error('Błąd parsowania wyników JSON:', e)
								reject(new Error('Nieprawidłowy format wyników z EasyOCR'))
							}
						} else {
							reject(new Error('Brak wyników z EasyOCR'))
						}
					})
					.catch(err => {
						console.error('Błąd podczas uruchamiania skryptu Python:', err)
						reject(err)
					})
			})
		})

		console.log('Uruchomiono procesy EasyOCR, oczekiwanie na wyniki...')
		const results = await Promise.all(ocrPromises)

		// Wybieramy wynik z najwyższą pewnością
		const bestResult = results.reduce(
			(prev, current) => {
				return current.success && current.average_confidence > (prev.average_confidence || 0) ? current : prev
			},
			{ success: false, average_confidence: 0 }
		)

		console.log('EasyOCR zakończone')
		if (bestResult.success) {
			console.log('Najlepsza pewność rozpoznania:', bestResult.average_confidence * 100 + '%')

			// Usuwamy pliki tymczasowe
			Object.values(processedImages).forEach(imagePath => {
				try {
					fs.unlinkSync(imagePath)
				} catch (e) {
					console.warn('Nie można usunąć pliku tymczasowego:', imagePath, e)
				}
			})

			return {
				success: true,
				text: bestResult.full_text,
				confidence: bestResult.average_confidence * 100, // Przeliczamy na procenty
				detailedResults: bestResult.detailed_results,
			}
		} else {
			throw new Error(bestResult.error || 'Nieznany błąd podczas OCR')
		}
	} catch (error) {
		console.error('Błąd podczas rozpoznawania tekstu z EasyOCR:', error)
		return {
			success: false,
			error: error.message || String(error),
		}
	}
}

// Import funkcji parsującej z istniejącego pliku receipt-parser.js
// Możemy ją zaimportować lub skopiować tutaj dla spójności
import { parseReceiptText } from './receipt-parser.js'

// Główna funkcja do przetwarzania obrazu paragonu
export async function processReceiptWithEasyOCR(imageData) {
	try {
		const ocrResult = await performEasyOCR(imageData)

		if (!ocrResult.success) {
			return {
				success: false,
				error: ocrResult.error,
			}
		}

		// Parsujemy wyniki OCR aby wyodrębnić istotne informacje
		const receiptData = parseReceiptText(ocrResult.text)

		// Wykorzystujemy pozycje tekstu, jeśli są dostępne, do lepszego rozpoznawania
		if (ocrResult.detailedResults && ocrResult.detailedResults.length > 0) {
			// Szukamy kwot - zazwyczaj znajdują się w prawej części paragonu
			const possibleAmounts = ocrResult.detailedResults
				.filter(item => item.text.match(/\d+[.,]\d{2}/))
				.sort((a, b) => {
					// Sortujemy według pozycji X (od prawej do lewej)
					const aRight = Math.max(...a.bbox.map(point => point[0]))
					const bRight = Math.max(...b.bbox.map(point => point[0]))
					return bRight - aRight
				})

			if (possibleAmounts.length > 0 && !receiptData.totalAmount) {
				// Sprawdzamy, czy w tekście są słowa kluczowe wskazujące na kwotę całkowitą
				const totalAmount = possibleAmounts.find(item => {
					const lowerText = item.text.toLowerCase()
					return (
						lowerText.includes('suma') ||
						lowerText.includes('razem') ||
						lowerText.includes('total') ||
						lowerText.includes('zapłaty')
					)
				})

				if (totalAmount) {
					const amount = parseFloat(totalAmount.text.match(/\d+[.,]\d{2}/)[0].replace(',', '.'))
					if (!isNaN(amount)) {
						receiptData.totalAmount = amount
					}
				} else if (possibleAmounts[0]) {
					// Bierzemy największą wartość z prawej strony
					const amount = parseFloat(possibleAmounts[0].text.match(/\d+[.,]\d{2}/)[0].replace(',', '.'))
					if (!isNaN(amount)) {
						receiptData.totalAmount = amount
					}
				}
			}
		}

		// Ustawiamy domyślną datę jeśli nie znaleziono
		if (!receiptData.date) {
			const today = new Date()
			receiptData.date = today.toISOString().split('T')[0]
		}

		return {
			success: true,
			data: receiptData,
			ocrText: ocrResult.text,
			confidence: ocrResult.confidence,
		}
	} catch (error) {
		console.error('Błąd podczas przetwarzania paragonu z EasyOCR:', error)
		return {
			success: false,
			error: error.message,
		}
	}
}
