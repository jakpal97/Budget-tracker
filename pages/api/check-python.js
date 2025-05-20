import { exec } from 'child_process'
import { promisify } from 'util'

const execAsync = promisify(exec)

export default async function handler(req, res) {
	// Obsługa CORS
	res.setHeader('Access-Control-Allow-Credentials', true)
	res.setHeader('Access-Control-Allow-Origin', '*')
	res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS')
	res.setHeader(
		'Access-Control-Allow-Headers',
		'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
	)

	if (req.method === 'OPTIONS') {
		return res.status(200).end()
	}

	if (req.method !== 'GET') {
		return res.status(405).json({ success: false, message: 'Metoda nie jest obsługiwana' })
	}

	try {
		// W środowisku produkcyjnym Vercel zawsze zakładamy, że Python jest dostępny
		if (process.env.VERCEL === '1' || process.env.NODE_ENV === 'production') {
			return res.status(200).json({
				pythonAvailable: true,
				easyOcrAvailable: true,
			})
		}

		// Sprawdź czy Python jest zainstalowany
		let pythonAvailable = false
		let easyOcrAvailable = false
		let pythonVersion = ''

		try {
			const { stdout } = await execAsync('python --version')
			pythonAvailable = true
			pythonVersion = stdout.trim()

			// Sprawdź czy EasyOCR jest zainstalowany
			try {
				await execAsync('python -c "import easyocr"')
				easyOcrAvailable = true
			} catch (error) {
				console.log('EasyOCR nie jest zainstalowany:', error.message)
			}
		} catch (error) {
			console.log('Python nie jest zainstalowany lub dostępny:', error.message)
		}

		return res.status(200).json({
			pythonAvailable,
			easyOcrAvailable,
			pythonVersion,
		})
	} catch (error) {
		console.error('Błąd podczas sprawdzania dostępności Pythona:', error)
		return res.status(500).json({
			success: false,
			message: 'Wystąpił błąd podczas sprawdzania dostępności Pythona',
			error: error.message,
		})
	}
}
