import { getServerSession } from 'next-auth/next'
import { authOptions } from '../auth/[...nextauth]'
import { connectToDatabase } from '../../../lib/db'
import Receipt from '../../../models/Receipt'
import Category from '../../../models/Category'
import SharedBudget from '../../../models/SharedBudget'
import Notification from '../../../models/Notification'

// Konfiguracja limitu rozmiaru ciała żądania
export const config = {
	api: {
		bodyParser: {
			sizeLimit: '10mb',
		},
	},
}

async function checkBudgetLimit(budget, totalAmount) {
	// Pobierz wszystkie paragony z bieżącego miesiąca
	const startOfMonth = new Date()
	startOfMonth.setDate(1)
	startOfMonth.setHours(0, 0, 0, 0)

	const receipts = await Receipt.find({
		sharedBudget: budget._id,
		date: { $gte: startOfMonth },
	})

	const monthlyTotal = receipts.reduce((sum, receipt) => sum + receipt.totalAmount, 0) + totalAmount
	const monthlyBudget = budget.monthlyBudget || 0

	if (monthlyBudget > 0 && monthlyTotal > monthlyBudget) {
		// Utwórz powiadomienia dla wszystkich członków
		const notifications = budget.members.map(member => ({
			userId: member.userId._id,
			budgetId: budget._id,
			type: 'budget_limit',
			title: 'Przekroczono limit budżetu!',
			message: `Przekroczono miesięczny limit budżetu (${monthlyBudget.toFixed(2)} zł) o ${(
				monthlyTotal - monthlyBudget
			).toFixed(2)} zł`,
		}))

		await Notification.insertMany(notifications)
	}
}

export default async function handler(req, res) {
	console.log('API Request Headers:', req.headers)

	// Użyj getServerSession z przekazaniem authOptions
	const session = await getServerSession(req, res, authOptions)

	console.log('Sesja użytkownika:', session)

	// Sprawdzenie, czy użytkownik jest zalogowany
	if (!session) {
		return res.status(401).json({ success: false, message: 'Nie jesteś zalogowany' })
	}

	// Sprawdzenie, czy ID użytkownika istnieje w sesji
	if (!session.user || !session.user.id) {
		console.error('Brak ID użytkownika w sesji:', session)
		return res.status(401).json({ success: false, message: 'Nieprawidłowa sesja' })
	}

	// Połączenie z bazą danych
	try {
		await connectToDatabase()
	} catch (error) {
		console.error('Błąd połączenia z bazą danych:', error)
		return res.status(500).json({ success: false, message: 'Błąd połączenia z bazą danych' })
	}

	// Obsługa metody GET - pobieranie paragonów
	if (req.method === 'GET') {
		try {
			console.log('=== Rozpoczęcie obsługi żądania GET ===')
			console.log('Data paragonu ze skanu:', new Date('2003-04-25')) // data z przykładu

			// Najpierw sprawdźmy wszystkie paragony dla użytkownika bez filtrów
			const allReceipts = await Receipt.find({ userId: session.user.id }).lean()
			console.log('Wszystkie paragony użytkownika (bez filtrów):', {
				count: allReceipts.length,
				daty: allReceipts.map(r => ({
					data: r.date,
					kwota: r.totalAmount,
					sklep: r.store,
				})),
			})

			// Pobieramy parametry filtrowania
			const { category, dateFrom, dateTo, search, sort = 'date-desc', period } = req.query
			console.log('Otrzymane parametry:', { category, dateFrom, dateTo, search, sort, period })

			// Budujemy zapytanie
			const query = { userId: session.user.id }
			console.log('ID użytkownika z sesji:', session.user.id)

			// Dodajemy filtrowanie po okresie
			if (period) {
				const now = new Date()
				let startDate = new Date(now)

				console.log('Okres filtrowania:', period)

				switch (period) {
					case 'month':
						// Zamiast filtrować po ostatnim miesiącu, pobierzmy wszystkie paragony z bieżącego miesiąca
						startDate = new Date(now.getFullYear(), now.getMonth(), 1)
						now.setMonth(now.getMonth() + 1, 0) // Ustawiamy na koniec bieżącego miesiąca
						break
					case 'quarter':
						startDate = new Date(now.getFullYear(), Math.floor(now.getMonth() / 3) * 3, 1)
						break
					case 'year':
						startDate = new Date(now.getFullYear(), 0, 1)
						break
					case 'all':
						// Dodajemy opcję pokazywania wszystkich paragonów
						startDate = new Date(0) // Początek czasu Unix
						break
					default:
						// Domyślnie pokazujemy wszystkie paragony
						startDate = new Date(0)
						console.log('Brak filtrowania po dacie - pokazuję wszystkie paragony')
						break
				}

				console.log('Zakres dat:', {
					od: startDate.toISOString(),
					do: now.toISOString(),
				})

				if (period !== 'all') {
					query.date = {
						$gte: startDate,
						$lte: now,
					}
				}
			}

			// Filtrowanie po kategorii
			if (category && category !== 'all') {
				query.categoryId = category
			}

			// Filtrowanie po dacie
			if (dateFrom || dateTo) {
				query.date = {}
				if (dateFrom) query.date.$gte = new Date(dateFrom)
				if (dateTo) query.date.$lte = new Date(dateTo)
			}

			// Filtrowanie po frażie wyszukiwania
			if (search) {
				query.$or = [{ store: { $regex: search, $options: 'i' } }, { notes: { $regex: search, $options: 'i' } }]
			}

			console.log('Finalne zapytanie:', JSON.stringify(query, null, 2))

			// Wykonujemy zapytanie do bazy danych
			let receipts = await Receipt.find(query).populate('categoryId', 'name color icon').lean()

			console.log('Znalezione paragony po filtrowaniu:', {
				count: receipts.length,
				przykład: receipts.length > 0 ? receipts[0] : null,
			})

			// Sortowanie wyników
			if (sort) {
				const [field, direction] = sort.split('-')
				const sortMultiplier = direction === 'asc' ? 1 : -1

				receipts.sort((a, b) => {
					if (field === 'date') {
						return sortMultiplier * (new Date(a.date) - new Date(b.date))
					} else if (field === 'amount') {
						return sortMultiplier * (a.totalAmount - b.totalAmount)
					} else if (field === 'name') {
						return sortMultiplier * a.store.localeCompare(b.store)
					}
					return 0
				})
			}

			// Zwracamy wyniki
			return res.status(200).json({
				success: true,
				data: receipts,
				debug: {
					query: query,
					timestamp: new Date().toISOString(),
					userId: session.user.id,
				},
			})
		} catch (error) {
			console.error('Błąd podczas pobierania paragonów:', error)
			return res.status(500).json({
				success: false,
				message: 'Wystąpił błąd podczas pobierania paragonów',
			})
		}
	}

	// Obsługa metody POST - dodawanie nowego paragonu
	if (req.method === 'POST') {
		try {
			const { store, date, totalAmount, items, notes, imageUrl, ocrText, categoryId, sharedBudgetId, splitRatio } =
				req.body

			console.log('=== Dodawanie nowego paragonu ===')
			console.log('ID użytkownika:', session.user.id)
			console.log('Dane paragonu:', { store, date, totalAmount, categoryId })

			// Walidacja danych
			if (!store || !date || !totalAmount) {
				return res.status(400).json({
					success: false,
					message: 'Brakuje wymaganych danych (sklep, data, kwota)',
				})
			}

			// Tworzymy nowy paragon
			const newReceipt = new Receipt({
				userId: session.user.id,
				store,
				date: new Date(date),
				totalAmount: parseFloat(totalAmount),
				items: items || [],
				notes: notes || '',
				imageUrl: imageUrl || null,
				ocrText: ocrText || null,
				categoryId: categoryId || null,
				createdAt: new Date(),
				updatedAt: new Date(),
			})

			// Jeśli paragon jest częścią wspólnego budżetu
			if (sharedBudgetId) {
				newReceipt.sharedBudget = sharedBudgetId
				newReceipt.contributedBy = session.user.id
				newReceipt.splitRatio = splitRatio || {}

				// Pobierz budżet i jego członków
				const budget = await SharedBudget.findById(sharedBudgetId).populate('members.userId', 'name')

				// Utwórz powiadomienia dla wszystkich członków oprócz osoby dodającej paragon
				const notifications = budget.members
					.filter(member => member.userId._id.toString() !== session.user.id)
					.map(member => ({
						userId: member.userId._id,
						budgetId: sharedBudgetId,
						type: 'new_receipt',
						title: 'Nowy paragon w budżecie',
						message: `${session.user.name} dodał(a) nowy paragon na kwotę ${totalAmount.toFixed(2)} zł w budżecie ${
							budget.name
						}`,
					}))

				await Notification.insertMany(notifications)

				// Sprawdź przekroczenie limitu
				await checkBudgetLimit(budget, parseFloat(totalAmount))
			}

			console.log('Obiekt paragonu przed zapisem:', newReceipt)

			// Zapisujemy paragon w bazie danych
			const savedReceipt = await newReceipt.save()
			console.log('Zapisany paragon:', savedReceipt)

			// Zwracamy odpowiedź
			return res.status(201).json({
				success: true,
				data: savedReceipt,
				message: 'Paragon został pomyślnie dodany',
			})
		} catch (error) {
			console.error('Błąd podczas dodawania paragonu:', error)
			return res.status(500).json({
				success: false,
				message: 'Wystąpił błąd podczas dodawania paragonu',
				error: error.message,
			})
		}
	}

	// Obsługa metody PATCH - aktualizacja istniejącego paragonu
	if (req.method === 'PATCH') {
		try {
			const { id, ...updateData } = req.body

			if (!id) {
				return res.status(400).json({
					success: false,
					message: 'Brakuje identyfikatora paragonu',
				})
			}

			// Sprawdzamy, czy paragon należy do użytkownika
			const receipt = await Receipt.findOne({
				_id: id,
				userId: session.user.id,
			})

			if (!receipt) {
				return res.status(404).json({
					success: false,
					message: 'Paragon nie został znaleziony',
				})
			}

			// Aktualizujemy paragon
			const updatedReceipt = await Receipt.findByIdAndUpdate(
				id,
				{
					...updateData,
					updatedAt: new Date(),
				},
				{ new: true, runValidators: true }
			)

			return res.status(200).json({
				success: true,
				data: updatedReceipt,
				message: 'Paragon został pomyślnie zaktualizowany',
			})
		} catch (error) {
			console.error('Błąd podczas aktualizacji paragonu:', error)
			return res.status(500).json({
				success: false,
				message: 'Wystąpił błąd podczas aktualizacji paragonu',
			})
		}
	}

	// Obsługa metody DELETE - usuwanie paragonu
	if (req.method === 'DELETE') {
		try {
			const { id } = req.query

			if (!id) {
				return res.status(400).json({
					success: false,
					message: 'Brakuje identyfikatora paragonu',
				})
			}

			// Sprawdzamy, czy paragon należy do użytkownika
			const receipt = await Receipt.findOne({
				_id: id,
				userId: session.user.id,
			})

			if (!receipt) {
				return res.status(404).json({
					success: false,
					message: 'Paragon nie został znaleziony',
				})
			}

			// Usuwamy paragon
			await Receipt.findByIdAndDelete(id)

			return res.status(200).json({
				success: true,
				message: 'Paragon został pomyślnie usunięty',
			})
		} catch (error) {
			console.error('Błąd podczas usuwania paragonu:', error)
			return res.status(500).json({
				success: false,
				message: 'Wystąpił błąd podczas usuwania paragonu',
			})
		}
	}

	// Jeśli metoda nie jest obsługiwana
	return res.status(405).json({
		success: false,
		message: 'Metoda nie jest obsługiwana',
	})
}
