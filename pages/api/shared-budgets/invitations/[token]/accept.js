import { getServerSession } from 'next-auth/next'
import { authOptions } from '../../../auth/[...nextauth]'
import { connectToDatabase } from '../../../../../lib/db'
import SharedBudget from '../../../../../models/SharedBudget'
import BudgetInvitation from '../../../../../models/BudgetInvitation'

export default async function handler(req, res) {
	const session = await getServerSession(req, res, authOptions)

	if (!session) {
		return res.status(401).json({ success: false, message: 'Nie jesteś zalogowany' })
	}

	if (req.method !== 'POST') {
		return res.status(405).json({ success: false, message: 'Metoda nie jest obsługiwana' })
	}

	const { token } = req.query

	try {
		await connectToDatabase()

		// Znajdź zaproszenie
		const invitation = await BudgetInvitation.findOne({
			token,
			status: 'pending',
		})

		if (!invitation) {
			return res.status(404).json({
				success: false,
				message: 'Zaproszenie nie zostało znalezione lub wygasło',
			})
		}

		// Znajdź budżet
		const budget = await SharedBudget.findById(invitation.budgetId)

		if (!budget) {
			return res.status(404).json({
				success: false,
				message: 'Budżet nie został znaleziony',
			})
		}

		// Dodaj użytkownika do budżetu
		budget.members.push({
			userId: session.user.id,
			role: 'editor',
			contributionRatio: invitation.contributionRatio,
		})

		await budget.save()

		// Zaktualizuj status zaproszenia
		invitation.status = 'accepted'
		invitation.acceptedAt = new Date()
		await invitation.save()

		return res.status(200).json({
			success: true,
			data: {
				budgetId: budget._id,
				message: 'Zaproszenie zostało zaakceptowane',
			},
		})
	} catch (error) {
		console.error('Błąd podczas akceptacji zaproszenia:', error)
		return res.status(500).json({
			success: false,
			message: 'Wystąpił błąd podczas akceptacji zaproszenia',
		})
	}
}
