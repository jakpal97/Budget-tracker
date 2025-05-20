import { getServerSession } from 'next-auth/next'
import { authOptions } from '../auth/[...nextauth]'
import { connectToDatabase } from '../../../lib/db'
import Expense from '../../../models/Expense'
import mongoose from 'mongoose'

export default async function handler(req, res) {
	const session = await getServerSession(req, res, authOptions)
	const { id } = req.query

	// Logi debugowania
	console.log('=== API expenses/[id].js - Debug Info ===')
	console.log('Request URL:', req.url)
	console.log('Request method:', req.method)
	console.log('Expense ID:', id)
	console.log('Session:', {
		user: session?.user,
		expires: session?.expires,
	})

	// Sprawdzenie sesji
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
		console.log('Błąd: Nieprawidłowy format ID wydatku:', id)
		return res.status(400).json({
			success: false,
			message: 'Nieprawidłowy format ID wydatku',
		})
	}

	// Obsługa metody GET
	if (req.method === 'GET') {
		try {
			console.log('Próba pobrania wydatku z bazy danych')
			console.log('Kryteria wyszukiwania:', {
				_id: id,
				userId: session.user.id,
			})

			const expense = await Expense.findOne({
				_id: id,
				userId: session.user.id,
			}).populate('categoryId', 'name color icon')

			console.log('Wynik wyszukiwania wydatku:', expense ? 'Znaleziono' : 'Nie znaleziono')

			if (!expense) {
				console.log('Wydatek nie został znaleziony w bazie danych')
				return res.status(404).json({
					success: false,
					message: 'Wydatek nie został znaleziony',
				})
			}

			console.log('Wydatek został znaleziony, zwracam dane')
			return res.status(200).json({
				success: true,
				data: expense,
			})
		} catch (error) {
			console.error('Szczegóły błędu podczas pobierania wydatku:', error)
			return res.status(500).json({
				success: false,
				message: 'Wystąpił błąd podczas pobierania wydatku',
				error: error.message,
			})
		}
	}

	// Obsługa metody PUT
	if (req.method === 'PUT') {
		try {
			const updateData = req.body

			// Walidacja danych
			if (!updateData.title || !updateData.date || !updateData.amount) {
				return res.status(400).json({
					success: false,
					message: 'Brakuje wymaganych danych (tytuł, data, kwota)',
				})
			}

			// Sprawdzamy, czy wydatek istnieje i należy do użytkownika
			const existingExpense = await Expense.findOne({
				_id: id,
				userId: session.user.id,
			})

			if (!existingExpense) {
				return res.status(404).json({
					success: false,
					message: 'Wydatek nie został znaleziony',
				})
			}

			// Aktualizujemy wydatek
			const updatedExpense = await Expense.findByIdAndUpdate(
				id,
				{
					...updateData,
					userId: session.user.id,
					updatedAt: new Date(),
				},
				{ new: true, runValidators: true }
			).populate('categoryId', 'name color icon')

			return res.status(200).json({
				success: true,
				data: updatedExpense,
				message: 'Wydatek został pomyślnie zaktualizowany',
			})
		} catch (error) {
			console.error('Błąd podczas aktualizacji wydatku:', error)
			return res.status(500).json({
				success: false,
				message: 'Wystąpił błąd podczas aktualizacji wydatku',
				error: error.message,
			})
		}
	}

	// Obsługa metody DELETE
	if (req.method === 'DELETE') {
		try {
			// Sprawdzamy, czy wydatek istnieje i należy do użytkownika
			const existingExpense = await Expense.findOne({
				_id: id,
				userId: session.user.id,
			})

			if (!existingExpense) {
				return res.status(404).json({
					success: false,
					message: 'Wydatek nie został znaleziony',
				})
			}

			await Expense.findByIdAndDelete(id)

			return res.status(200).json({
				success: true,
				message: 'Wydatek został pomyślnie usunięty',
			})
		} catch (error) {
			console.error('Błąd podczas usuwania wydatku:', error)
			return res.status(500).json({
				success: false,
				message: 'Wystąpił błąd podczas usuwania wydatku',
				error: error.message,
			})
		}
	}

	// Nieobsługiwana metoda
	return res.status(405).json({
		success: false,
		message: 'Metoda nie jest obsługiwana',
	})
}
