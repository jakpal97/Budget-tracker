import { getServerSession } from 'next-auth/next'
import { authOptions } from '../../auth/[...nextauth]'
import { connectToDatabase } from '../../../../lib/db'
import SharedBudget from '../../../../models/SharedBudget'
import Receipt from '../../../../models/Receipt'
import Notification from '../../../../models/Notification'

export default async function handler(req, res) {
	const session = await getServerSession(req, res, authOptions)

	if (!session) {
		return res.status(401).json({ success: false, message: 'Nie jesteś zalogowany' })
	}

	if (req.method !== 'POST') {
		return res.status(405).json({ success: false, message: 'Metoda nie jest obsługiwana' })
	}

	try {
		await connectToDatabase()

		const { budgetId } = req.body

		// Sprawdź uprawnienia
		const budget = await SharedBudget.findOne({
			_id: budgetId,
			'members.userId': session.user.id,
		}).populate('members.userId', 'name email')

		if (!budget) {
			return res.status(404).json({
				success: false,
				message: 'Nie znaleziono budżetu',
			})
		}

		// Pobierz niezrozliczone paragony z ostatniego miesiąca
		const lastMonth = new Date()
		lastMonth.setMonth(lastMonth.getMonth() - 1)
		lastMonth.setDate(1)
		lastMonth.setHours(0, 0, 0, 0)

		const receipts = await Receipt.find({
			sharedBudget: budgetId,
			date: { $gte: lastMonth },
		}).populate('contributedBy', 'name')

		if (receipts.length > 0) {
			// Oblicz kwoty do rozliczenia
			const totalAmount = receipts.reduce((sum, receipt) => sum + receipt.totalAmount, 0)

			// Utwórz powiadomienia dla wszystkich członków
			const notifications = budget.members.map(member => ({
				userId: member.userId._id,
				budgetId: budget._id,
				type: 'settlement_reminder',
				title: 'Przypomnienie o rozliczeniu',
				message: `Masz nierozliczone wydatki w budżecie "${budget.name}" na łączną kwotę ${totalAmount.toFixed(
					2
				)} zł z ostatniego miesiąca`,
			}))

			await Notification.insertMany(notifications)

			return res.status(200).json({
				success: true,
				message: 'Wysłano przypomnienia o rozliczeniu',
			})
		}

		return res.status(200).json({
			success: true,
			message: 'Brak wydatków do rozliczenia',
		})
	} catch (error) {
		console.error('Błąd podczas wysyłania przypomnień:', error)
		return res.status(500).json({
			success: false,
			message: 'Wystąpił błąd podczas wysyłania przypomnień',
		})
	}
}
