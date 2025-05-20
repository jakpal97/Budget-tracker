import { getServerSession } from 'next-auth/next'
import { authOptions } from '../auth/[...nextauth]'
import { connectToDatabase } from '../../../lib/db'
import { Budget } from '../../../models/Budget'

export default async function handler(req, res) {
	const session = await getServerSession(req, res, authOptions)

	if (!session) {
		return res.status(401).json({
			success: false,
			message: 'Nie jesteś zalogowany',
		})
	}

	// Połączenie z bazą danych
	try {
		await connectToDatabase()
	} catch (error) {
		console.error('Błąd połączenia z bazą danych:', error)
		return res.status(500).json({ success: false, message: 'Błąd połączenia z bazą danych' })
	}

	// Obsługa metody GET - pobieranie budżetów
	if (req.method === 'GET') {
		try {
			// Pobieramy wszystkie aktywne budżety użytkownika
			const budgets = await Budget.find({
				userId: session.user.id,
				isActive: true,
			})
				.populate('categoryId', 'name color icon')
				.sort({ createdAt: -1 })
				.lean()

			return res.status(200).json({
				success: true,
				data: budgets,
			})
		} catch (error) {
			console.error('Błąd podczas pobierania budżetów:', error)
			return res.status(500).json({
				success: false,
				message: 'Wystąpił błąd podczas pobierania budżetów',
			})
		}
	}

	// Obsługa metody POST - dodawanie nowego budżetu
	if (req.method === 'POST') {
		try {
			const { name, amount, period, startDate, endDate, categoryId, autoRenew } = req.body

			// Walidacja danych
			if (!name || !amount || !period) {
				return res.status(400).json({
					success: false,
					message: 'Nazwa, kwota i okres budżetu są wymagane',
				})
			}

			// Walidacja kwoty
			const parsedAmount = parseFloat(amount)
			if (isNaN(parsedAmount) || parsedAmount <= 0) {
				return res.status(400).json({
					success: false,
					message: 'Kwota budżetu musi być liczbą większą od zera',
				})
			}

			// Walidacja okresu
			const allowedPeriods = ['weekly', 'monthly', 'yearly']
			if (!allowedPeriods.includes(period)) {
				return res.status(400).json({
					success: false,
					message: 'Nieprawidłowy okres budżetu',
				})
			}

			// Tworzymy nowy budżet
			const newBudget = new Budget({
				userId: session.user.id,
				name,
				amount: parsedAmount,
				period,
				startDate: startDate ? new Date(startDate) : new Date(),
				endDate: endDate ? new Date(endDate) : null,
				categoryId: categoryId || null,
				isActive: true,
				autoRenew: autoRenew !== undefined ? autoRenew : true,
				createdAt: new Date(),
				updatedAt: new Date(),
			})

			// Zapisujemy budżet w bazie danych
			await newBudget.save()

			// Zwracamy odpowiedź
			return res.status(201).json({
				success: true,
				data: newBudget,
				message: 'Budżet został pomyślnie dodany',
			})
		} catch (error) {
			console.error('Błąd podczas dodawania budżetu:', error)
			return res.status(500).json({
				success: false,
				message: 'Wystąpił błąd podczas dodawania budżetu',
			})
		}
	}

	// Obsługa metody PATCH - aktualizacja istniejącego budżetu
	if (req.method === 'PATCH') {
		try {
			const { id, ...updateData } = req.body

			if (!id) {
				return res.status(400).json({
					success: false,
					message: 'Brakuje identyfikatora budżetu',
				})
			}

			// Sprawdzamy, czy budżet należy do użytkownika
			const budget = await Budget.findOne({
				_id: id,
				userId: session.user.id,
			})

			if (!budget) {
				return res.status(404).json({
					success: false,
					message: 'Budżet nie został znaleziony',
				})
			}

			// Aktualizujemy budżet
			const updatedBudget = await Budget.findByIdAndUpdate(
				id,
				{
					...updateData,
					updatedAt: new Date(),
				},
				{ new: true, runValidators: true }
			).populate('categoryId', 'name color icon')

			return res.status(200).json({
				success: true,
				data: updatedBudget,
				message: 'Budżet został pomyślnie zaktualizowany',
			})
		} catch (error) {
			console.error('Błąd podczas aktualizacji budżetu:', error)
			return res.status(500).json({
				success: false,
				message: 'Wystąpił błąd podczas aktualizacji budżetu',
			})
		}
	}

	// Obsługa metody DELETE - usuwanie budżetu
	if (req.method === 'DELETE') {
		try {
			const { id } = req.query

			if (!id) {
				return res.status(400).json({
					success: false,
					message: 'Brakuje identyfikatora budżetu',
				})
			}

			// Sprawdzamy, czy budżet należy do użytkownika
			const budget = await Budget.findOne({
				_id: id,
				userId: session.user.id,
			})

			if (!budget) {
				return res.status(404).json({
					success: false,
					message: 'Budżet nie został znaleziony',
				})
			}

			// Usuwamy budżet (soft delete - ustawiamy isActive na false)
			await Budget.findByIdAndUpdate(id, { isActive: false, updatedAt: new Date() })

			return res.status(200).json({
				success: true,
				message: 'Budżet został pomyślnie usunięty',
			})
		} catch (error) {
			console.error('Błąd podczas usuwania budżetu:', error)
			return res.status(500).json({
				success: false,
				message: 'Wystąpił błąd podczas usuwania budżetu',
			})
		}
	}

	// Jeśli metoda nie jest obsługiwana
	return res.status(405).json({
		success: false,
		message: 'Metoda nie jest obsługiwana',
	})
}
