import { getServerSession } from 'next-auth/next'
import { authOptions } from '../auth/[...nextauth]'
import { connectToDatabase } from '../../../lib/db'
import SharedBudget from '../../../models/SharedBudget'

export default async function handler(req, res) {
	const session = await getServerSession(req, res, authOptions)

	if (!session) {
		return res.status(401).json({ success: false, message: 'Nie jesteś zalogowany' })
	}

	await connectToDatabase()

	if (req.method === 'GET') {
		try {
			const budgets = await SharedBudget.find({
				'members.userId': session.user.id,
			}).populate('members.userId', 'name email')

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

	if (req.method === 'POST') {
		try {
			const { name, description, monthlyBudget } = req.body

			const newBudget = new SharedBudget({
				name,
				description,
				monthlyBudget,
				members: [
					{
						userId: session.user.id,
						role: 'owner',
						contributionRatio: 100,
					},
				],
			})

			await newBudget.save()

			return res.status(201).json({
				success: true,
				data: newBudget,
			})
		} catch (error) {
			console.error('Błąd podczas tworzenia budżetu:', error)
			return res.status(500).json({
				success: false,
				message: 'Wystąpił błąd podczas tworzenia budżetu',
			})
		}
	}

	return res.status(405).json({ success: false, message: 'Metoda nie jest obsługiwana' })
}
