import Tesseract from 'tesseract.js'
import sharp from 'sharp'

// UWAGA: Aby osiągnąć dokładność rozpoznawania tekstu na poziomie 90%+ dla paragonów,
// zalecane jest użycie specjalizowanych API OCR takich jak:
// - Google Cloud Vision API (https://cloud.google.com/vision)
// - Microsoft Azure Computer Vision (https://azure.microsoft.com/services/cognitive-services/computer-vision/)
// - Amazon Textract (https://aws.amazon.com/textract/)
// Te API oferują znacznie lepsze rozpoznawanie tekstu, ale są płatne.
// Obecne rozwiązanie oparte na Tesseract OCR jest darmowe, ale ma ograniczoną skuteczność.

// Funkcja do preprocessingu obrazu
async function preprocessImage(imagePath) {
	try {
		// Sprawdzamy rozmiar obrazu
		const metadata = await sharp(imagePath).metadata()
		console.log('Oryginalny rozmiar obrazu:', metadata)

		// Tworzymy jeszcze więcej wariantów przetworzonych obrazów dla lepszych wyników
		// 1. Obraz z podwyższonym kontrastem do maksimum
		const highContrastImage = await sharp(imagePath)
			.resize({
				width: 2400, // Zwiększamy rozdzielczość
				withoutEnlargement: false,
				fit: 'inside',
			})
			.sharpen({ sigma: 2.5, m1: 10, m2: 3 })
			.linear(2.0, -80) // Mocno zwiększamy kontrast
			.normalize()
			.gamma(1.8)
			.toBuffer()

		// 2. Czarno-biały obraz (bardzo ostre progi)
		const bwImage = await sharp(imagePath)
			.resize({
				width: 2400,
				withoutEnlargement: false,
				fit: 'inside',
			})
			.grayscale()
			.sharpen({ sigma: 1.8, m1: 8, m2: 2 })
			.normalize()
			.threshold(128) // Czarno-biały
			.toBuffer()

		// 3. Obraz ze wzmocnionymi krawędziami tekstu
		const edgeImage = await sharp(imagePath)
			.resize({
				width: 2400,
				withoutEnlargement: false,
				fit: 'inside',
			})
			.grayscale()
			.convolve({
				width: 3,
				height: 3,
				kernel: [-1, -1, -1, -1, 9.5, -1, -1, -1, -1], // Mocniejsze wzmocnienie krawędzi
			})
			.sharpen({ sigma: 1.2 })
			.normalize()
			.toBuffer()

		// 4. Bardzo jasny obraz (dla ciemnych paragonów)
		const brightImage = await sharp(imagePath)
			.resize({
				width: 2400,
				withoutEnlargement: false,
				fit: 'inside',
			})
			.grayscale()
			.modulate({ brightness: 1.8 }) // Mocno zwiększamy jasność
			.gamma(1.2) // Zmieniono z 0.7 na 1.2 (wartość gamma musi być między 1.0 a 3.0)
			.normalize()
			.toBuffer()

		// 5. Niżej rozdzielczy obraz (dla zbyt szczegółowych paragonów)
		const lowResImage = await sharp(imagePath)
			.resize({
				width: 1200,
				withoutEnlargement: false,
				fit: 'inside',
			})
			.grayscale()
			.blur(0.5) // Lekko rozmywamy
			.normalize()
			.gamma(1.2)
			.toBuffer()

		// 6. Wyostrzony oryginalny obraz
		const originalEnhanced = await sharp(imagePath)
			.resize({
				width: 2000,
				fit: 'inside',
				withoutEnlargement: false,
			})
			.recomb([
				[0.4, 0.4, 0.2], // Czerwony kanał
				[0.2, 0.7, 0.1], // Zielony kanał
				[0.1, 0.1, 0.8], // Niebieski kanał
			])
			.sharpen()
			.toBuffer()

		console.log('Obrazy przetworzone')
		return {
			highContrast: highContrastImage,
			bw: bwImage,
			edge: edgeImage,
			bright: brightImage,
			lowRes: lowResImage,
			original: originalEnhanced,
		}
	} catch (error) {
		console.error('Błąd podczas przetwarzania obrazu:', error)
		throw new Error(`Błąd przetwarzania obrazu: ${error.message}`)
	}
}

// Bardziej zaawansowana konfiguracja OCR z różnymi trybami
const ocrConfigs = {
	default: {
		lang: 'pol',
		options: {
			tessjs_create_pdf: '0',
			tessjs_create_hocr: '0',
			tessjs_create_tsv: '0',
			tessjs_create_box: '0',
			tessjs_create_unlv: '0',
			tessjs_create_osd: '0',
		},
	},
	receipt: {
		lang: 'pol',
		options: {
			tessedit_pageseg_mode: '6', // Tryb segmentacji dla tekstu w kolumnach
			tessedit_char_whitelist:
				'0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyząćęłńóśźżĄĆĘŁŃÓŚŹŻ,.()-:/ ',
			tessjs_create_pdf: '0',
			tessjs_create_hocr: '0',
			tessjs_create_tsv: '0',
			tessjs_create_box: '0',
			tessjs_create_unlv: '0',
			tessjs_create_osd: '0',
		},
	},
	single_line: {
		lang: 'pol',
		options: {
			tessedit_pageseg_mode: '7', // Tryb dla pojedynczej linii tekstu (lepszy dla kwot i dat)
			tessedit_char_whitelist:
				'0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyząćęłńóśźżĄĆĘŁŃÓŚŹŻ,.()-:/ ',
			tessjs_create_pdf: '0',
			tessjs_create_hocr: '0',
			tessjs_create_tsv: '0',
			tessjs_create_box: '0',
			tessjs_create_unlv: '0',
			tessjs_create_osd: '0',
		},
	},
	digits: {
		lang: 'pol',
		options: {
			tessedit_pageseg_mode: '7',
			tessedit_char_whitelist: '0123456789,.', // Tylko cyfry i separatory
			tessjs_create_pdf: '0',
			tessjs_create_hocr: '0',
			tessjs_create_tsv: '0',
			tessjs_create_box: '0',
			tessjs_create_unlv: '0',
			tessjs_create_osd: '0',
		},
	},
}

// Główna funkcja do przeprowadzania OCR na obrazie paragonu
export async function performOCR(imageData) {
	try {
		console.log('Rozpoczynanie preprocessingu obrazu...')
		const processedImages = await preprocessImage(imageData)
		console.log('Preprocessing zakończony, rozpoczynam OCR...')

		// Wykonujemy OCR dla każdego wariantu obrazu z różnymi konfiguracjami
		const ocrPromises = [
			Tesseract.recognize(processedImages.highContrast, ocrConfigs.receipt.lang, {
				...ocrConfigs.receipt.options,
				logger: m => console.log(`OCR (high contrast): ${m.status} - ${Math.floor(m.progress * 100)}%`),
			}),

			Tesseract.recognize(processedImages.bw, ocrConfigs.receipt.lang, {
				...ocrConfigs.receipt.options,
				logger: m => console.log(`OCR (black & white): ${m.status} - ${Math.floor(m.progress * 100)}%`),
			}),

			Tesseract.recognize(processedImages.edge, ocrConfigs.receipt.lang, {
				...ocrConfigs.receipt.options,
				logger: m => console.log(`OCR (edge): ${m.status} - ${Math.floor(m.progress * 100)}%`),
			}),

			Tesseract.recognize(processedImages.bright, ocrConfigs.receipt.lang, {
				...ocrConfigs.receipt.options,
				logger: m => console.log(`OCR (bright): ${m.status} - ${Math.floor(m.progress * 100)}%`),
			}),

			Tesseract.recognize(processedImages.lowRes, ocrConfigs.receipt.lang, {
				...ocrConfigs.receipt.options,
				logger: m => console.log(`OCR (low res): ${m.status} - ${Math.floor(m.progress * 100)}%`),
			}),

			Tesseract.recognize(processedImages.original, ocrConfigs.receipt.lang, {
				...ocrConfigs.receipt.options,
				logger: m => console.log(`OCR (original): ${m.status} - ${Math.floor(m.progress * 100)}%`),
			}),

			// Dodatkowy przebieg dla pojedynczych linii (lepsze dla dat i kwot)
			Tesseract.recognize(processedImages.highContrast, ocrConfigs.single_line.lang, {
				...ocrConfigs.single_line.options,
				logger: m => console.log(`OCR (single line): ${m.status} - ${Math.floor(m.progress * 100)}%`),
			}),

			// Specjalny przebieg tylko dla cyfr (lepsze dla kwot)
			Tesseract.recognize(processedImages.bw, ocrConfigs.digits.lang, {
				...ocrConfigs.digits.options,
				logger: m => console.log(`OCR (digits only): ${m.status} - ${Math.floor(m.progress * 100)}%`),
			}),
		]

		console.log('Uruchomiono wszystkie procesy OCR, oczekiwanie na wyniki...')

		const results = await Promise.all(ocrPromises)

		// Wybieramy wynik z najwyższą pewnością dla głównego tekstu
		const mainTextResults = results.slice(0, 6)
		const bestTextResult = mainTextResults.reduce((prev, current) => {
			return current.data.confidence > prev.data.confidence ? current : prev
		}, mainTextResults[0])

		console.log('OCR zakończone')
		console.log('Najlepsza pewność rozpoznania:', bestTextResult.data.confidence + '%')

		// Wypisujemy wszystkie wyniki dla debugowania
		results.forEach((result, index) => {
			console.log(
				`Wynik ${index + 1} (pewność ${result.data.confidence}%):`,
				result.data.text.substring(0, 100) + '...'
			)
		})

		// WAŻNE: Nigdy nie osiągniemy 90% pewności na paragonach z Tesseract OCR
		// Dla takich wyników potrzebne są specjalistyczne API OCR
		const realConfidence = Math.min(bestTextResult.data.confidence, 65) // Realnie nie przekraczamy 65%

		return {
			success: true,
			text: bestTextResult.data.text,
			confidence: realConfidence,
			digitsText: results[7].data.text, // Tekst z OCR skonfigurowanym tylko dla cyfr
			singleLineText: results[6].data.text, // Tekst z OCR dla pojedynczych linii
			allResults: results.map(r => ({
				text: r.data.text,
				confidence: r.data.confidence,
			})),
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
export function parseReceiptText(text, extraResults = {}) {
	console.log('Parsowanie tekstu paragonu...')

	const receiptData = {
		store: '',
		date: '',
		totalAmount: 0,
		items: [],
	}

	try {
		// Rozdzielamy tekst na linie i usuwamy puste oraz zbyt krótkie
		const lines = text
			.split('\n')
			.map(line => line.trim())
			.filter(line => line.length > 2)
			.map(line => line.replace(/[|\\/{}\[\]]/g, '')) // Usuwamy znaki specjalne często błędnie interpretowane

		console.log('Oczyszczone linie tekstu:', lines)

		// Dodatkowe teksty do analizy z innych wariantów OCR
		let digitsText = ''
		let singleLineText = ''

		if (extraResults.digitsText) {
			digitsText = extraResults.digitsText
			console.log('Dodatkowy tekst z OCR dla cyfr:', digitsText)
		}

		if (extraResults.singleLineText) {
			singleLineText = extraResults.singleLineText
			console.log(
				'Dodatkowy tekst z OCR dla pojedynczych linii:',
				singleLineText.substring(0, 100) + (singleLineText.length > 100 ? '...' : '')
			)
		}

		// Przeszukujemy tylko ograniczoną liczbę linii dla lepszej wydajności
		const significantLines = lines.slice(0, Math.min(lines.length, 50))

		// Szukamy nazwy sklepu (pierwsze linie, które nie zawierają cyfr i znaków specjalnych)
		for (let i = 0; i < Math.min(8, significantLines.length); i++) {
			const line = significantLines[i]
			const normalizedLine = line.replace(/[^a-zA-ZąćęłńóśźżĄĆĘŁŃÓŚŹŻ\s-]/g, '')

			if (normalizedLine.length > 3 && !normalizedLine.match(/^\d/) && !normalizedLine.match(/^[A-Z]{2,}$/)) {
				receiptData.store = normalizedLine.trim()
				break
			}
		}

		// Szukamy daty w głównym tekście i dodatkowym tekście z pojedynczych linii
		const textsToSearchForDate = [text, singleLineText]
		let dateFound = false

		for (const searchText of textsToSearchForDate) {
			if (dateFound) break

			const datePatterns = [
				/(\d{2})[-.\/](\d{2})[-.\/](\d{4})/, // DD.MM.YYYY
				/(\d{2})[-.\/](\d{2})[-.\/](\d{2})/, // DD.MM.YY
				/(\d{4})[-.\/](\d{2})[-.\/](\d{2})/, // YYYY.MM.DD
				/(\d{1,2})[-.\/](\d{1,2})[-.\/](\d{2,4})/, // Elastyczny wzorzec
			]

			// Normalizacja tekstu pod kątem dat - zastępujemy niepotrzebne znaki spacjami
			const dateSearchText = searchText.replace(/[^0-9-./\n]/g, ' ')
			const dateLines = dateSearchText.split('\n')

			for (const line of dateLines) {
				if (dateFound) break

				for (const pattern of datePatterns) {
					const match = line.match(pattern)
					if (match) {
						let [_, first, second, third] = match
						let year, month, day

						// Dodajemy wiodące zera
						first = first.padStart(2, '0')
						second = second.padStart(2, '0')

						if (third.length === 2) {
							third = '20' + third
						}

						// Określamy format daty
						if (first.length === 4) {
							// YYYY.MM.DD
							;[year, month, day] = [first, second, third]
						} else {
							// DD.MM.YYYY or DD.MM.YY
							;[day, month, year] = [first, second, third]
						}

						// Walidacja daty
						const date = new Date(year, month - 1, day)
						const currentYear = new Date().getFullYear()

						if (
							date.getFullYear() >= 2010 &&
							date.getFullYear() <= currentYear &&
							month >= 1 &&
							month <= 12 &&
							day >= 1 &&
							day <= 31
						) {
							receiptData.date = `${year}-${month}-${day}`
							dateFound = true
							break
						}
					}
				}
			}
		}

		// Szukamy kwoty całkowitej w trzech źródłach: główny tekst, tekst z cyfr, tekst z pojedynczych linii
		const textsToSearchForAmount = [text, digitsText, singleLineText]
		const allAmounts = []

		for (const searchText of textsToSearchForAmount) {
			// Wzorce dla kwot z różnymi słowami kluczowymi
			const totalPatterns = [
				/(?:SUMA|RAZEM|ŁĄCZNIE|TOTAL|DO ZAPŁATY|ZAPŁACONO|WARTOŚĆ|SPRZEDAŻ)[^0-9]*(\d+[.,]\d{2})/i,
				/(\d+[.,]\d{2})[^0-9]*(?:PLN|ZŁ)/i,
				/(\d+[.,]\d{2})/, // Ogólny wzorzec dla kwot (mniej priorytetowy)
			]

			// Szukamy kwot w całym tekście
			for (let i = 0; i < totalPatterns.length; i++) {
				const pattern = totalPatterns[i]
				const regex = new RegExp(pattern, 'g')
				let match

				while ((match = regex.exec(searchText)) !== null) {
					const amount = parseFloat(match[1].replace(',', '.'))

					if (!isNaN(amount) && amount > 0) {
						// Priorytet: 1. kwoty po słowie kluczowym, 2. kwoty z walutą, 3. zwykłe kwoty
						allAmounts.push({
							amount,
							priority: i,
							context: searchText.substring(
								Math.max(0, match.index - 20),
								Math.min(searchText.length, match.index + match[0].length + 20)
							),
						})
					}
				}
			}
		}

		// Sortujemy kwoty według priorytetu, a następnie według wielkości (malejąco)
		allAmounts.sort((a, b) => {
			if (a.priority !== b.priority) return a.priority - b.priority
			return b.amount - a.amount
		})

		// Jeśli znaleziono kwoty, wybieramy najlepszą
		if (allAmounts.length > 0) {
			receiptData.totalAmount = allAmounts[0].amount
			console.log('Znaleziona kwota:', receiptData.totalAmount, 'z kontekstem:', allAmounts[0].context)
		}

		console.log('Parsowanie zakończone, znalezione dane:', {
			store: receiptData.store,
			date: receiptData.date,
			totalAmount: receiptData.totalAmount,
			itemsCount: receiptData.items.length,
		})

		return receiptData
	} catch (error) {
		console.error('Błąd podczas parsowania tekstu:', error)
		return receiptData
	}
}

// Główna funkcja do przetwarzania obrazu paragonu
export async function processReceiptImage(imageData) {
	try {
		const ocrResult = await performOCR(imageData)

		if (!ocrResult.success) {
			return {
				success: false,
				error: ocrResult.error,
			}
		}

		// Próbujemy znaleźć najlepsze dane z wszystkich wyników OCR
		let bestReceiptData = { store: '', date: '', totalAmount: 0, items: [] }

		// Główne parsowanie z dodatkowymi danymi z innych wariantów OCR
		bestReceiptData = parseReceiptText(ocrResult.text, {
			digitsText: ocrResult.digitsText,
			singleLineText: ocrResult.singleLineText,
		})

		// Dodatkowo parsujemy każdy wynik osobno, jeśli mamy dostęp do wyników z różnych wariantów
		if (ocrResult.allResults && ocrResult.allResults.length > 0) {
			// Parsujemy każdy wynik
			const allParsedResults = ocrResult.allResults.map(result => parseReceiptText(result.text))

			// Wybieramy najlepszy sklep (niepusty)
			if (!bestReceiptData.store) {
				const stores = allParsedResults.map(data => data.store).filter(store => store && store.length > 3)

				if (stores.length > 0) {
					bestReceiptData.store = stores[0]
				}
			}

			// Wybieramy najlepszą datę (niepusta)
			if (!bestReceiptData.date) {
				const dates = allParsedResults.map(data => data.date).filter(date => date)

				if (dates.length > 0) {
					bestReceiptData.date = dates[0]
				}
			}

			// Wybieramy najlepszą kwotę (największa niepusta)
			if (bestReceiptData.totalAmount === 0) {
				const amounts = allParsedResults.map(data => data.totalAmount).filter(amount => amount > 0)

				if (amounts.length > 0) {
					// Wybieramy najczęściej występującą kwotę, a jeśli brak powtórzeń - największą
					const amountFrequency = {}

					amounts.forEach(amount => {
						amountFrequency[amount] = (amountFrequency[amount] || 0) + 1
					})

					let mostFrequentAmount = 0
					let highestFrequency = 0

					for (const [amount, frequency] of Object.entries(amountFrequency)) {
						if (frequency > highestFrequency) {
							highestFrequency = frequency
							mostFrequentAmount = parseFloat(amount)
						}
					}

					bestReceiptData.totalAmount = mostFrequentAmount || Math.max(...amounts)
				}
			}
		}

		// Ustawiamy domyślną datę jeśli nie znaleziono
		if (!bestReceiptData.date) {
			const today = new Date()
			bestReceiptData.date = today.toISOString().split('T')[0]
		}

		return {
			success: true,
			data: bestReceiptData,
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
