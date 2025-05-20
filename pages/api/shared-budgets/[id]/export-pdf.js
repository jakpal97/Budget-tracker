import { getServerSession } from 'next-auth/next'
import { authOptions } from '../../auth/[...nextauth]'
import { connectToDatabase } from '../../../../lib/db'
import SharedBudget from '../../../../models/SharedBudget'
import Receipt from '../../../../models/Receipt'
import PDFDocument from 'pdfkit'

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

		// Pobierz dane rozliczeń
		const receipts = await Receipt.find({
			sharedBudget: id,
		})
			.populate('contributedBy', 'name')
			.populate('categoryId', 'name')

		// Utwórz PDF
		const doc = new PDFDocument()

		// Ustaw nagłówki odpowiedzi
		res.setHeader('Content-Type', 'application/pdf')
		res.setHeader('Content-Disposition', `attachment; filename=rozliczenia-${budget.name}.pdf`)

		// Pipe PDF do odpowiedzi
		doc.pipe(res)

		// Dodaj treść do PDF
		doc.fontSize(20).text('Rozliczenie budżetu', { align: 'center' })
		doc.fontSize(16).text(budget.name, { align: 'center' })
		doc.moveDown()

		// Podsumowanie
		doc.fontSize(14).text('Podsumowanie wydatków')
		doc.moveDown()

		const totalAmount = receipts.reduce((sum, r) => sum + r.totalAmount, 0)
		doc.text(`Łączna kwota: ${totalAmount.toFixed(2)} zł`)
		doc.text(`Liczba paragonów: ${receipts.length}`)
		doc.moveDown()

		// Lista członków i ich udziałów
		doc.fontSize(14).text('Członkowie budżetu')
		doc.moveDown()

		budget.members.forEach(member => {
			doc.text(`${member.userId.name} - ${member.contributionRatio}%`)
		})
		doc.moveDown()

		// Lista paragonów
		doc.fontSize(14).text('Lista paragonów')
		doc.moveDown()

		receipts.forEach(receipt => {
			doc.fontSize(12).text(`${receipt.date.toLocaleDateString()} - ${receipt.store}`, { continued: true })
			doc.text(`${receipt.totalAmount.toFixed(2)} zł`, { align: 'right' })
			doc.fontSize(10).text(`Dodał(a): ${receipt.contributedBy.name}`, { indent: 20 })
			if (receipt.categoryId) {
				doc.text(`Kategoria: ${receipt.categoryId.name}`, { indent: 20 })
			}
			doc.moveDown()
		})

		// Zakończ dokument
		doc.end()
	} catch (error) {
		console.error('Błąd podczas generowania PDF:', error)
		return res.status(500).json({
			success: false,
			message: 'Wystąpił błąd podczas generowania PDF',
		})
	}
}
