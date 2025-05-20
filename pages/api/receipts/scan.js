import { getServerSession } from 'next-auth/next'
import { authOptions } from '../auth/[...nextauth]'
import formidable from 'formidable'
import { processReceiptImage } from '../../../lib/receipt-parser'
import { processReceiptWithEasyOCR } from '../../../lib/easyocr-parser'
import fs from 'fs'

export const config = {
	api: {
		bodyParser: false,
	},
}

export default async function handler(req, res) {
	// Obsługa CORS
	res.setHeader('Access-Control-Allow-Credentials', true)
	res.setHeader('Access-Control-Allow-Origin', '*')
	res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS')
	res.setHeader(
		'Access-Control-Allow-Headers',
		'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
	)

	if (req.method === 'OPTIONS') {
		return res.status(200).end()
	}

	if (req.method !== 'POST') {
		return res.status(405).json({ success: false, message: 'Metoda nie jest obsługiwana' })
	}

	// Sprawdzanie autoryzacji
	let session
	try {
		session = await getServerSession(req, res, authOptions)
		if (!session) {
			return res.status(401).json({ success: false, message: 'Nie jesteś zalogowany' })
		}
	} catch (error) {
		console.error('Błąd autoryzacji:', error)
		return res.status(500).json({
			success: false,
			message: 'Błąd podczas weryfikacji sesji',
			error: error.message,
		})
	}

	try {
		// Konfiguracja formidable
		const options = {
			keepExtensions: true,
			maxFileSize: 10 * 1024 * 1024, // 10 MB
			maxFields: 10,
			uploadDir: isVercel() ? '/tmp' : undefined,
		}

		const form = formidable(options)
		const [fields, files] = await new Promise((resolve, reject) => {
			form.parse(req, (err, fields, files) => {
				if (err) reject(err)
				else resolve([fields, files])
			})
		})

		if (!files.receipt || !files.receipt[0]) {
			return res.status(400).json({ success: false, message: 'Nie przesłano zdjęcia paragonu' })
		}

		const file = files.receipt[0]

		// Pobranie flagi useEasyOCR z żądania
		const useEasyOCR = fields.useEasyOCR && fields.useEasyOCR[0] === 'true'

		// Zastosowanie odpowiedniej metody OCR
		let result
		let fallbackUsed = false

		try {
			if (useEasyOCR) {
				console.log('Używam EasyOCR do rozpoznawania tekstu...')
				result = await processReceiptWithEasyOCR(file.filepath)
			} else {
				console.log('Używam Tesseract do rozpoznawania tekstu...')
				result = await processReceiptImage(file.filepath)
			}

			// Fallback jeśli pierwotna metoda zawiodła
			if (!result.success) {
				fallbackUsed = true
				if (useEasyOCR) {
					console.log('EasyOCR nie powiodło się, próbuję Tesseract jako fallback...')
					result = await processReceiptImage(file.filepath)
				} else {
					console.log('Tesseract nie powiodło się, próbuję EasyOCR jako fallback...')
					result = await processReceiptWithEasyOCR(file.filepath)
				}
			}
		} catch (error) {
			console.error('Błąd podczas OCR:', error)
			return res.status(500).json({
				success: false,
				message: 'Błąd podczas rozpoznawania tekstu',
				error: error.message,
			})
		} finally {
			// Usuwamy tymczasowy plik po przetworzeniu
			try {
				if (fs.existsSync(file.filepath)) {
					fs.unlinkSync(file.filepath)
				}
			} catch (err) {
				console.warn('Nie można usunąć pliku tymczasowego:', err)
			}
		}

		// Jeśli nadal się nie udało, zwracamy błąd
		if (!result.success) {
			return res.status(400).json({
				success: false,
				message: 'Nie udało się przetworzyć paragonu',
				error: result.error,
			})
		}

		return res.status(200).json({
			success: true,
			data: {
				...result.data,
				ocrText: result.ocrText,
				confidence: result.confidence,
				fallbackUsed,
			},
		})
	} catch (error) {
		console.error('Nieoczekiwany błąd podczas przetwarzania paragonu:', error)
		return res.status(500).json({
			success: false,
			message: 'Wystąpił nieoczekiwany błąd podczas przetwarzania paragonu',
			error: error.message,
		})
	}
}

// Sprawdza czy kod działa na Vercel
function isVercel() {
	return process.env.VERCEL === '1'
}
