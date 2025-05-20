import { getServerSession } from 'next-auth/next'
import { authOptions } from '../auth/[...nextauth]'
import dbConnect from '../../../lib/dbConnect'
import Expense from '../../../models/Expense'
import SharedBudget from '../../../models/SharedBudget'

export default async function handler(req, res) {
	const session = await getServerSession(req, res, authOptions)
	console.log('Sesja w API:', session)

	if (!session) {
		return res.status(401).json({ success: false, message: 'Nie jesteś zalogowany' })
	}

	if (!session.user?.id) {
		console.error('Brak ID użytkownika w sesji:', session)
		return res.status(400).json({ success: false, message: 'Nieprawidłowa sesja użytkownika' })
	}

	await dbConnect()

	switch (req.method) {
		case 'GET':
			try {
				console.log('Pobieranie wydatków dla użytkownika:', session.user.id)

				// Najpierw sprawdź czy istnieją jakiekolwiek wydatki
				const expensesCount = await Expense.countDocuments({ userId: session.user.id })
				console.log('Liczba znalezionych wydatków:', expensesCount)

				// Pobierz wszystkie wydatki użytkownika
				let expenses = await Expense.find({
					userId: session.user.id,
				})
					.populate('categoryId')
					.populate('sharedBudgetId')
					.sort({ date: -1 })
					.lean() // Dodajemy lean() dla lepszej wydajności

				console.log('Pobrane wydatki przed dodaniem przykładowego:', expenses)

				// Jeśli nie ma żadnych wydatków, dodaj przykładowy
				if (expensesCount === 0) {
					console.log('Brak wydatków, dodaję przykładowy...')
					const testExpense = await Expense.create({
						title: 'Przykładowy wydatek',
						amount: 100,
						date: new Date(),
						userId: session.user.id,
						type: 'personal',
					})

					expenses = [testExpense]
				}

				console.log('Finalne wydatki do wysłania:', expenses)

				return res.status(200).json({
					success: true,
					data: expenses,
					userId: session.user.id,
					totalCount: expenses.length,
				})
			} catch (error) {
				console.error('Błąd podczas pobierania wydatków:', error)
				return res.status(400).json({ success: false, message: error.message })
			}

		case 'POST':
			try {
				const { type, sharedBudgetId, ...expenseData } = req.body

				// Sprawdź uprawnienia dla wydatków wspólnych
				if (type === 'shared') {
					const budget = await SharedBudget.findById(sharedBudgetId)
					if (!budget) {
						return res.status(404).json({
							success: false,
							message: 'Nie znaleziono budżetu wspólnego',
						})
					}

					const isMember = budget.members.some(member => member.userId.toString() === session.user.id.toString())

					if (!isMember) {
						return res.status(403).json({
							success: false,
							message: 'Nie masz dostępu do tego budżetu',
						})
					}

					// Sprawdź limit miesięczny
					const currentMonth = new Date().getMonth()
					const currentYear = new Date().getFullYear()

					const monthlyExpenses = await Expense.aggregate([
						{
							$match: {
								sharedBudgetId: budget._id,
								type: 'shared',
								date: {
									$gte: new Date(currentYear, currentMonth, 1),
									$lt: new Date(currentYear, currentMonth + 1, 1),
								},
							},
						},
						{
							$group: {
								_id: null,
								total: { $sum: '$amount' },
							},
						},
					])

					const currentTotal = monthlyExpenses[0]?.total || 0
					if (currentTotal + expenseData.amount > budget.monthlyBudget) {
						return res.status(400).json({
							success: false,
							message: 'Przekroczono miesięczny limit budżetu wspólnego',
						})
					}
				}

				const expense = await Expense.create({
					...expenseData,
					type,
					sharedBudgetId: type === 'shared' ? sharedBudgetId : null,
					userId: session.user.id,
				})

				return res.status(201).json({ success: true, data: expense })
			} catch (error) {
				return res.status(400).json({ success: false, message: error.message })
			}

		default:
			return res.status(400).json({ success: false, message: 'Nieobsługiwana metoda' })
	}
}
