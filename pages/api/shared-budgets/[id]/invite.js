import { getServerSession } from 'next-auth/next'
import { authOptions } from '../../auth/[...nextauth]'
import { connectToDatabase } from '../../../../lib/db'
import SharedBudget from '../../../../models/SharedBudget'
import crypto from 'crypto'

export default async function handler(req, res) {
	const session = await getServerSession(req, res, authOptions)

	if (!session) {
		return res.status(401).json({ success: false, message: 'Nie jesteś zalogowany' })
	}

	const { id } = req.query

	if (req.method !== 'POST') {
		return res.status(405).json({ success: false, message: 'Metoda nie jest obsługiwana' })
	}

	try {
		await connectToDatabase()

		// Sprawdź, czy użytkownik ma uprawnienia do zapraszania
		const budget = await SharedBudget.findOne({
			_id: id,
			'members.userId': session.user.id,
		})

		if (!budget) {
			return res.status(404).json({
				success: false,
				message: 'Nie znaleziono budżetu',
			})
		}

		const userMember = budget.members.find(m => m.userId.toString() === session.user.id)

		if (!userMember || userMember.role !== 'owner') {
			return res.status(403).json({
				success: false,
				message: 'Brak uprawnień do zapraszania użytkowników',
			})
		}

		const { email, contributionRatio } = req.body

		// Sprawdź, czy użytkownik nie jest już członkiem
		const isAlreadyMember = budget.members.some(m => m.userId.email === email)

		if (isAlreadyMember) {
			return res.status(400).json({
				success: false,
				message: 'Ten użytkownik jest już członkiem budżetu',
			})
		}

		// Generuj token zaproszenia
		const inviteToken = crypto.randomBytes(32).toString('hex')

		// TODO: Tutaj należy dodać wysyłanie emaila z zaproszeniem
		// Przykład: await sendInvitationEmail(email, inviteToken, budget.name)

		return res.status(200).json({
			success: true,
			message: 'Zaproszenie zostało wysłane',
		})
	} catch (error) {
		console.error('Błąd podczas wysyłania zaproszenia:', error)
		return res.status(500).json({
			success: false,
			message: 'Wystąpił błąd podczas wysyłania zaproszenia',
		})
	}
}
