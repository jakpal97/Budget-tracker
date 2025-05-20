import Tesseract from 'tesseract.js'

// Główna funkcja do przeprowadzania OCR na obrazie paragonu
export async function performOCR(imageData) {
	try {
		console.log('Rozpoczynanie OCR...')

		// Używamy Tesseract.js do rozpoznania tekstu
		// Dla polskich paragonów ustawiamy język na polski
		const result = await Tesseract.recognize(imageData, 'pol', {
			logger: m => console.log(`OCR Progress: ${m.status} - ${Math.floor(m.progress * 100)}%`),
		})

		console.log('OCR zakończone')

		// Zwracamy rozpoznany tekst
		return {
			success: true,
			text: result.data.text,
			confidence: result.data.confidence,
		}
	} catch (error) {
		console.error('Błąd podczas rozpoznawania tekstu:', error)
		return {
			success: false,
			error: error.message,
		}
	}
}

// Funkcja do analizy tekstu paragonu i wyodrębnienia istotnych informacji
export function parseReceiptText(text) {
	console.log('Parsowanie tekstu paragonu...')

	// Inicjalizacja danych paragonu
	const receiptData = {
		store: '',
		date: '',
		totalAmount: 0,
		items: [],
	}

	// Rozdzielamy tekst na linie
	const lines = text.split('\n').filter(line => line.trim() !== '')

	// Próbujemy znaleźć nazwę sklepu (zazwyczaj w pierwszych kilku liniach)
	for (let i = 0; i < Math.min(5, lines.length); i++) {
		const line = lines[i].trim()
		if (line.length > 3 && !line.match(/^\d/)) {
			receiptData.store = line
			break
		}
	}

	// Szukamy daty w formacie DD-MM-YYYY, DD.MM.YYYY, DD/MM/YYYY lub podobnym
	const dateRegex = /(\d{1,2})[-.\/](\d{1,2})[-.\/](\d{2,4})/
	for (const line of lines) {
		const match = line.match(dateRegex)
		if (match) {
			// Formatujemy datę jako YYYY-MM-DD dla spójności
			const day = match[1].padStart(2, '0')
			const month = match[2].padStart(2, '0')
			let year = match[3]

			// Obsługa 2-cyfrowego roku
			if (year.length === 2) {
				const currentYear = new Date().getFullYear()
				const century = Math.floor(currentYear / 100) * 100
				year = century + parseInt(year)
			}

			receiptData.date = `${year}-${month}-${day}`
			break
		}
	}

	// Jeśli nie znaleziono daty, użyj dzisiejszej
	if (!receiptData.date) {
		const today = new Date()
		receiptData.date = today.toISOString().split('T')[0]
	}

	// Szukamy kwoty całkowitej (szukamy słów SUMA, RAZEM, ŁĄCZNIE itp.)
	const totalRegexes = [
		/SUMA\s*:?\s*(\d+[.,]\d{2})/i,
		/RAZEM\s*:?\s*(\d+[.,]\d{2})/i,
		/ŁĄCZNIE\s*:?\s*(\d+[.,]\d{2})/i,
		/TOTAL\s*:?\s*(\d+[.,]\d{2})/i,
		/DO ZAPŁATY\s*:?\s*(\d+[.,]\d{2})/i,
		/ZAPŁACONO\s*:?\s*(\d+[.,]\d{2})/i,
		/(\d+[.,]\d{2})\s*PLN/i,
	]

	for (const line of lines) {
		for (const regex of totalRegexes) {
			const match = line.match(regex)
			if (match) {
				// Zamieniamy przecinek na kropkę dla ujednolicenia
				receiptData.totalAmount = parseFloat(match[1].replace(',', '.'))
				break
			}
		}
		if (receiptData.totalAmount > 0) break
	}

	// Próbujemy rozpoznać poszczególne pozycje
	// Szukamy wzorców typu "Nazwa produktu X.XX" lub "Nazwa produktu X.XX X.XX"
	const itemRegex = /(.+)\s+(\d+[.,]\d{2})(?:\s+(\d+[.,]\d{2}))?$/
	let itemsSection = false

	for (const line of lines) {
		// Ignorujemy linie z prawdopodobnymi nagłówkami lub stopkami
		if (line.match(/paragon|fiskalny|sprzedaż|zakup|nr paragonu|nip|regon|kasa/i)) {
			continue
		}

		// Próbujemy rozpoznać początek sekcji z przedmiotami
		if (line.match(/lp|nazwa|ilość|cena|wartość/i)) {
			itemsSection = true
			continue
		}

		// Próbujemy rozpoznać koniec sekcji z przedmiotami
		if (itemsSection && line.match(/suma|razem|łącznie|podsuma/i)) {
			itemsSection = false
			continue
		}

		// Jeśli linia wygląda jak pozycja na paragonie
		const match = line.match(itemRegex)
		if (match) {
			const name = match[1].trim()
			const price = parseFloat(match[2].replace(',', '.'))

			// Niektóre paragony mają cenę jednostkową i łączną
			// W takim przypadku bierzemy łączną cenę
			const totalPrice = match[3] ? parseFloat(match[3].replace(',', '.')) : price

			// Dodajemy tylko sensowne pozycje (z nazwą i ceną)
			if (name.length > 1 && price > 0) {
				receiptData.items.push({
					name,
					price: totalPrice,
					quantity: 1, // Domyślnie ustawiamy ilość na 1
				})
			}
		}
	}

	console.log('Parsowanie zakończone, znalezione dane:', {
		store: receiptData.store,
		date: receiptData.date,
		totalAmount: receiptData.totalAmount,
		itemsCount: receiptData.items.length,
	})

	return receiptData
}

// Główna funkcja do przetwarzania obrazu paragonu
export async function processReceiptImage(imageData) {
	try {
		// Przeprowadzamy OCR na obrazie
		const ocrResult = await performOCR(imageData)

		if (!ocrResult.success) {
			return {
				success: false,
				error: ocrResult.error,
			}
		}

		// Analizujemy rozpoznany tekst
		const receiptData = parseReceiptText(ocrResult.text)

		return {
			success: true,
			data: receiptData,
			ocrText: ocrResult.text,
			confidence: ocrResult.confidence,
		}
	} catch (error) {
		console.error('Błąd podczas przetwarzania paragonu:', error)
		return {
			success: false,
			error: error.message,
		}
	}
}
