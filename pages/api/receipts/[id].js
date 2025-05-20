import { getServerSession } from 'next-auth/next'
import { authOptions } from '../auth/[...nextauth]'
import { connectToDatabase } from '../../../lib/db'
import Receipt from '../../../models/Receipt'
import mongoose from 'mongoose'

// Dodajemy konfigurację limitu rozmiaru żądania
export const config = {
	api: {
		bodyParser: {
			sizeLimit: '10mb',
		},
	},
}

export default async function handler(req, res) {
	// Używamy getServerSession zamiast getSession
	const session = await getServerSession(req, res, authOptions)
	const { id } = req.query

	// Dodajemy szczegółowe logi dla debugowania
	console.log('=== API [id].js - Debug Info ===')
	console.log('Request URL:', req.url)
	console.log('Request method:', req.method)
	console.log('Receipt ID:', id)
	console.log('Session:', {
		user: session?.user,
		expires: session?.expires,
	})

	// Sprawdzenie, czy użytkownik jest zalogowany
	if (!session) {
		console.log('Błąd: Brak sesji użytkownika')
		return res.status(401).json({ success: false, message: 'Nie jesteś zalogowany' })
	}

	// Połączenie z bazą danych
	try {
		await connectToDatabase()
		console.log('Połączenie z bazą danych: Sukces')
	} catch (error) {
		console.error('Błąd połączenia z bazą danych:', error)
		return res.status(500).json({ success: false, message: 'Błąd połączenia z bazą danych' })
	}

	// Sprawdzenie poprawności ID
	if (!mongoose.Types.ObjectId.isValid(id)) {
		console.log('Błąd: Nieprawidłowy format ID paragonu:', id)
		return res.status(400).json({
			success: false,
			message: 'Nieprawidłowy format ID paragonu',
		})
	}

	// Obsługa metody GET - pobieranie szczegółów paragonu
	if (req.method === 'GET') {
		try {
			console.log('Próba pobrania paragonu z bazy danych')
			console.log('Kryteria wyszukiwania:', {
				_id: id,
				userId: session.user.id,
			})

			// Sprawdzamy, czy paragon istnieje i należy do użytkownika
			const receipt = await Receipt.findOne({
				_id: id,
				userId: session.user.id,
			}).populate('categoryId', 'name color icon')

			console.log('Wynik wyszukiwania paragonu:', receipt ? 'Znaleziono' : 'Nie znaleziono')

			if (!receipt) {
				console.log('Paragon nie został znaleziony w bazie danych')
				return res.status(404).json({
					success: false,
					message: 'Paragon nie został znaleziony',
				})
			}

			console.log('Paragon został znaleziony, zwracam dane')
			return res.status(200).json({
				success: true,
				data: receipt,
			})
		} catch (error) {
			console.error('Szczegóły błędu podczas pobierania paragonu:', error)
			return res.status(500).json({
				success: false,
				message: 'Wystąpił błąd podczas pobierania paragonu',
				error: error.message,
				stack: process.env.NODE_ENV === 'development' ? error.stack : undefined,
			})
		}
	}

	// Obsługa metody PUT - aktualizacja całego paragonu
	if (req.method === 'PUT') {
		try {
			const updateData = req.body
			console.log('API [id].js - Update data:', updateData)

			// Walidacja danych
			if (!updateData.store || !updateData.date || !updateData.totalAmount) {
				return res.status(400).json({
					success: false,
					message: 'Brakuje wymaganych danych (sklep, data, kwota)',
				})
			}

			// Sprawdzamy, czy paragon istnieje i należy do użytkownika
			const existingReceipt = await Receipt.findOne({
				_id: id,
				userId: session.user.id,
			})

			if (!existingReceipt) {
				return res.status(404).json({
					success: false,
					message: 'Paragon nie został znaleziony',
				})
			}

			// Aktualizujemy paragon
			const updatedReceipt = await Receipt.findByIdAndUpdate(
				id,
				{
					...updateData,
					userId: session.user.id, // Upewniamy się, że użytkownik się nie zmieni
					updatedAt: new Date(),
				},
				{ new: true, runValidators: true }
			).populate('categoryId', 'name color icon')

			console.log('API [id].js - Updated receipt:', updatedReceipt)

			return res.status(200).json({
				success: true,
				data: updatedReceipt,
				message: 'Paragon został pomyślnie zaktualizowany',
			})
		} catch (error) {
			console.error('Błąd podczas aktualizacji paragonu:', error)
			return res.status(500).json({
				success: false,
				message: 'Wystąpił błąd podczas aktualizacji paragonu',
				error: error.message,
			})
		}
	}

	// Obsługa metody DELETE - usuwanie paragonu
	if (req.method === 'DELETE') {
		try {
			// Sprawdzamy, czy paragon istnieje i należy do użytkownika
			const existingReceipt = await Receipt.findOne({
				_id: id,
				userId: session.user.id,
			})

			if (!existingReceipt) {
				return res.status(404).json({
					success: false,
					message: 'Paragon nie został znaleziony',
				})
			}

			await Receipt.findByIdAndDelete(id)

			return res.status(200).json({
				success: true,
				message: 'Paragon został pomyślnie usunięty',
			})
		} catch (error) {
			console.error('Błąd podczas usuwania paragonu:', error)
			return res.status(500).json({
				success: false,
				message: 'Wystąpił błąd podczas usuwania paragonu',
				error: error.message,
			})
		}
	}

	// Jeśli metoda nie jest obsługiwana
	return res.status(405).json({
		success: false,
		message: 'Metoda nie jest obsługiwana',
	})
}
