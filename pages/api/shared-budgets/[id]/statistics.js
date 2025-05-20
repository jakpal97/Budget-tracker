import { getServerSession } from 'next-auth/next'
import { authOptions } from '../../auth/[...nextauth]'
import { connectToDatabase } from '../../../../lib/db'
import SharedBudget from '../../../../models/SharedBudget'
import Receipt from '../../../../models/Receipt'
import Category from '../../../../models/Category'

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
		})
			.populate('contributedBy', 'name')
			.populate('categoryId', 'name color')

		// Oblicz statystyki
		const totalAmount = receipts.reduce((sum, receipt) => sum + receipt.totalAmount, 0)

		// Statystyki według użytkowników
		const byUser = {}
		budget.members.forEach(member => {
			byUser[member.userId._id] = {
				user: member.userId.name,
				amount: 0,
				count: 0,
			}
		})

		// Statystyki według kategorii
		const byCategory = {}

		// Statystyki według miesięcy
		const byMonth = {}

		receipts.forEach(receipt => {
			// Dodaj do statystyk użytkownika
			const userId = receipt.contributedBy._id
			byUser[userId].amount += receipt.totalAmount
			byUser[userId].count += 1

			// Dodaj do statystyk kategorii
			const categoryId = receipt.categoryId ? receipt.categoryId._id : 'uncategorized'
			const categoryName = receipt.categoryId ? receipt.categoryId.name : 'Bez kategorii'
			if (!byCategory[categoryId]) {
				byCategory[categoryId] = {
					name: categoryName,
					amount: 0,
					count: 0,
					color: receipt.categoryId ? receipt.categoryId.color : '#999999',
				}
			}
			byCategory[categoryId].amount += receipt.totalAmount
			byCategory[categoryId].count += 1

			// Dodaj do statystyk miesięcznych
			const monthKey = receipt.date.toISOString().slice(0, 7)
			if (!byMonth[monthKey]) {
				byMonth[monthKey] = {
					amount: 0,
					count: 0,
				}
			}
			byMonth[monthKey].amount += receipt.totalAmount
			byMonth[monthKey].count += 1
		})

		// Przygotuj dane do odpowiedzi
		const statistics = {
			totalAmount,
			receiptCount: receipts.length,
			averageAmount: totalAmount / receipts.length,
			byUser: Object.values(byUser),
			byCategory: Object.values(byCategory),
			byMonth: Object.entries(byMonth)
				.map(([month, stats]) => ({
					month,
					...stats,
				}))
				.sort((a, b) => b.month.localeCompare(a.month)),
			monthlyAverage: totalAmount / Object.keys(byMonth).length,
			budgetProgress: budget.monthlyBudget ? (totalAmount / budget.monthlyBudget) * 100 : null,
		}

		return res.status(200).json({
			success: true,
			data: statistics,
		})
	} catch (error) {
		console.error('Błąd podczas pobierania statystyk:', error)
		return res.status(500).json({
			success: false,
			message: 'Wystąpił błąd podczas pobierania statystyk',
		})
	}
}
