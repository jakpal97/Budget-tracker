import { getServerSession } from 'next-auth/next'
import { authOptions } from '../auth/[...nextauth]'
import SharedBudget from '../../../models/SharedBudget'
import dbConnect from '../../../lib/dbConnect'
import mongoose from 'mongoose'

export default async function handler(req, res) {
	const session = await getServerSession(req, res, authOptions)

	if (!session) {
		return res.status(401).json({ success: false, message: 'Nie jesteś zalogowany' })
	}

	try {
		await dbConnect()

		const { id } = req.query
		const { method } = req

		console.log('Requested budget ID:', id)

		// Sprawdź czy ID jest poprawne
		if (!mongoose.Types.ObjectId.isValid(id)) {
			return res.status(400).json({
				success: false,
				message: 'Nieprawidłowy format ID budżetu',
			})
		}

		// Pobierz budżet
		const budget = await SharedBudget.findById(id)
		if (!budget) {
			return res.status(404).json({
				success: false,
				message: 'Nie znaleziono budżetu',
			})
		}

		// Sprawdź uprawnienia
		const isMember = budget.members.some(member => member.userId.toString() === session.user.id.toString())

		if (!isMember) {
			return res.status(403).json({
				success: false,
				message: 'Nie masz dostępu do tego budżetu',
			})
		}

		switch (method) {
			case 'GET':
				return res.status(200).json({
					success: true,
					data: budget,
				})

			case 'DELETE':
				await SharedBudget.findByIdAndDelete(id)
				return res.status(200).json({
					success: true,
					message: 'Budżet został usunięty',
				})

			case 'PATCH':
				const { name, monthlyLimit } = req.body

				console.log('Otrzymane dane:', { name, monthlyLimit })
				console.log('ID budżetu:', id)

				// Aktualizuj budżet używając prawidłowej nazwy pola
				const updatedBudget = await SharedBudget.findByIdAndUpdate(
					id,
					{
						$set: {
							name: name,
							monthlyBudget: monthlyLimit,
						},
					},
					{ new: true, runValidators: true }
				)

				// Sprawdź czy aktualizacja się powiodła
				if (!updatedBudget) {
					console.log('Nie udało się zaktualizować budżetu')
					return res.status(400).json({
						success: false,
						message: 'Nie udało się zaktualizować budżetu',
					})
				}

				console.log('Zaktualizowany budżet:', updatedBudget)
				return res.status(200).json({
					success: true,
					data: updatedBudget,
				})

			default:
				return res.status(400).json({
					success: false,
					message: 'Nieobsługiwana metoda',
				})
		}
	} catch (error) {
		console.error('Error in shared budget API:', error)
		return res.status(500).json({
			success: false,
			message: 'Wystąpił błąd serwera',
		})
	}
}
