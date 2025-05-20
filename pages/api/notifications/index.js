import { getServerSession } from 'next-auth/next'
import { authOptions } from '../auth/[...nextauth]'
import { connectToDatabase } from '../../../lib/db'
import Notification from '../../../models/Notification'

export default async function handler(req, res) {
	const session = await getServerSession(req, res, authOptions)

	if (!session) {
		return res.status(401).json({ success: false, message: 'Nie jesteś zalogowany' })
	}

	if (req.method === 'GET') {
		try {
			await connectToDatabase()

			const notifications = await Notification.find({
				userId: session.user.id,
				isRead: false,
			})
				.sort({ createdAt: -1 })
				.populate('budgetId', 'name')
				.limit(10)

			return res.status(200).json({
				success: true,
				data: notifications,
			})
		} catch (error) {
			console.error('Błąd podczas pobierania powiadomień:', error)
			return res.status(500).json({
				success: false,
				message: 'Wystąpił błąd podczas pobierania powiadomień',
			})
		}
	}

	if (req.method === 'PATCH') {
		try {
			const { notificationId } = req.body

			await connectToDatabase()

			await Notification.findOneAndUpdate({ _id: notificationId, userId: session.user.id }, { isRead: true })

			return res.status(200).json({
				success: true,
				message: 'Powiadomienie oznaczono jako przeczytane',
			})
		} catch (error) {
			console.error('Błąd podczas aktualizacji powiadomienia:', error)
			return res.status(500).json({
				success: false,
				message: 'Wystąpił błąd podczas aktualizacji powiadomienia',
			})
		}
	}

	return res.status(405).json({ success: false, message: 'Metoda nie jest obsługiwana' })
}
