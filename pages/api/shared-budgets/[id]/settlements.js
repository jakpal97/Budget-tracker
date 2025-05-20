import { getServerSession } from 'next-auth/next'
import { authOptions } from '../../auth/[...nextauth]'
import { connectToDatabase } from '../../../../lib/db'
import SharedBudget from '../../../../models/SharedBudget'
import Receipt from '../../../../models/Receipt'
import User from '../../../../models/User'

export default async function handler(req, res) {
	const session = await getServerSession(req, res, authOptions)

	if (!session) {
		return res.status(401).json({ success: false, message: 'Nie jesteś zalogowany' })
	}

	if (req.method !== 'GET') {
		return res.status(405).json({ success: false, message: 'Metoda nie jest obsługiwana' })
	}

	const { id } = req.query

	try {
		await connectToDatabase()

		// Pobierz budżet i sprawdź uprawnienia
		const budget = await SharedBudget.findOne({
			_id: id,
			'members.userId': session.user.id,
		}).populate('members.userId', 'name email')

		if (!budget) {
			return res.status(404).json({
				success: false,
				message: 'Nie znaleziono budżetu',
			})
		}

		// Pobierz wszystkie paragony dla tego budżetu
		const receipts = await Receipt.find({
			sharedBudget: id,
		}).populate('contributedBy', 'name')

		// Oblicz wydatki każdego użytkownika
		const expenses = {}
		const expectedContributions = {}
		const totalAmount = receipts.reduce((sum, receipt) => sum + receipt.totalAmount, 0)

		// Inicjalizuj struktury danych
		budget.members.forEach(member => {
			expenses[member.userId._id] = 0
			expectedContributions[member.userId._id] = (totalAmount * member.contributionRatio) / 100
		})

		// Sumuj faktyczne wydatki
		receipts.forEach(receipt => {
			expenses[receipt.contributedBy._id] += receipt.totalAmount
		})

		// Oblicz rozliczenia
		const settlements = []
		const balances = {}

		// Oblicz saldo każdego użytkownika
		budget.members.forEach(member => {
			const userId = member.userId._id
			balances[userId] = expenses[userId] - expectedContributions[userId]
		})

		// Generuj rozliczenia
		while (Object.values(balances).some(balance => Math.abs(balance) > 0.01)) {
			const maxDebtor = Object.entries(balances).reduce((a, b) => (b[1] < a[1] ? b : a))[0]
			const maxCreditor = Object.entries(balances).reduce((a, b) => (b[1] > a[1] ? b : a))[0]

			const amount = Math.min(Math.abs(balances[maxDebtor]), balances[maxCreditor])

			if (amount > 0.01) {
				const debtorName = budget.members.find(m => m.userId._id.toString() === maxDebtor).userId.name
				const creditorName = budget.members.find(m => m.userId._id.toString() === maxCreditor).userId.name

				settlements.push({
					from: debtorName,
					to: creditorName,
					amount: Number(amount.toFixed(2)),
				})

				balances[maxDebtor] += amount
				balances[maxCreditor] -= amount
			}
		}

		return res.status(200).json({
			success: true,
			data: {
				settlements,
				summary: {
					totalAmount,
					expenses: Object.entries(expenses).map(([userId, amount]) => ({
						user: budget.members.find(m => m.userId._id.toString() === userId).userId.name,
						amount: Number(amount.toFixed(2)),
					})),
				},
			},
		})
	} catch (error) {
		console.error('Błąd podczas obliczania rozliczeń:', error)
		return res.status(500).json({
			success: false,
			message: 'Wystąpił błąd podczas obliczania rozliczeń',
		})
	}
}
