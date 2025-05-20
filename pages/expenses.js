import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/router'
import { useSession } from 'next-auth/react'
import Card from '../components/common/Card'
import Button from '../components/common/Button'
import Input from '../components/common/Input'
import styles from './expenses/Expenses.module.css'

const dateRanges = [
	{ id: 'all', name: 'Wszystkie' },
	{ id: 'today', name: 'Dzisiaj' },
	{ id: 'week', name: 'Ten tydzień' },
	{ id: 'month', name: 'Ten miesiąc' },
	{ id: 'year', name: 'Ten rok' },
]

const sortOptions = [
	{ id: 'date-desc', name: 'Data (najnowsze)' },
	{ id: 'date-asc', name: 'Data (najstarsze)' },
	{ id: 'amount-desc', name: 'Kwota (największe)' },
	{ id: 'amount-asc', name: 'Kwota (najmniejsze)' },
]

export default function ExpensesPage() {
	const router = useRouter()
	const { data: session, status } = useSession()
	const [expenses, setExpenses] = useState([])
	const [categories, setCategories] = useState([])
	const [isLoading, setIsLoading] = useState(true)
	const [error, setError] = useState(null)
	const [searchQuery, setSearchQuery] = useState('')
	const [selectedCategory, setSelectedCategory] = useState('all')
	const [selectedDateRange, setSelectedDateRange] = useState('all')
	const [sortBy, setSortBy] = useState('date-desc')
	const [isDeleting, setIsDeleting] = useState(false)
	const [loadingStates, setLoadingStates] = useState({})

	useEffect(() => {
		console.log('Status sesji:', status)
		console.log('Sesja:', session)

		if (session) {
			console.log('Sesja istnieje, pobieram dane...')
			fetchExpenses()
			fetchCategories()
		}
	}, [session])

	const fetchExpenses = async () => {
		try {
			console.log('Rozpoczynam pobieranie wydatków...')
			setError(null)
			const response = await fetch('/api/expenses')
			console.log('Odpowiedź z API:', response.status, response.statusText)

			if (!response.ok) {
				throw new Error(`Błąd HTTP: ${response.status} ${response.statusText}`)
			}

			const data = await response.json()
			console.log('Pobrane dane z API:', {
				success: data.success,
				totalCount: data.totalCount,
				userId: data.userId,
				wydatki: data.data,
			})

			if (data.success) {
				if (data.data && Array.isArray(data.data)) {
					console.log('Ustawiam wydatki w stanie:', data.data)
					setExpenses(data.data)
				} else {
					console.error('Nieprawidłowy format danych:', data)
					throw new Error('Otrzymano nieprawidłowy format danych z API')
				}
			} else {
				throw new Error(data.message || 'Nie udało się pobrać wydatków')
			}
		} catch (error) {
			console.error('Szczegóły błędu:', error)
			setError(error.message || 'Wystąpił błąd podczas pobierania wydatków. Spróbuj ponownie później.')
		} finally {
			setIsLoading(false)
		}
	}

	const fetchCategories = async () => {
		try {
			const response = await fetch('/api/categories')
			const data = await response.json()

			if (data.success) {
				setCategories(data.data)
			} else {
				throw new Error(data.message)
			}
		} catch (error) {
			console.error('Błąd podczas pobierania kategorii:', error)
		}
	}

	const handleDeleteExpense = async expenseId => {
		if (!window.confirm('Czy na pewno chcesz usunąć ten wydatek?')) {
			return
		}

		setLoadingStates(prev => ({ ...prev, [expenseId]: true }))
		setIsDeleting(true)

		try {
			const response = await fetch(`/api/expenses/${expenseId}`, {
				method: 'DELETE',
			})

			if (!response.ok) {
				throw new Error(`Błąd HTTP: ${response.status}`)
			}

			const data = await response.json()

			if (data.success) {
				setExpenses(expenses.filter(expense => expense._id !== expenseId))
			} else {
				throw new Error(data.message || 'Nie udało się usunąć wydatku')
			}
		} catch (error) {
			setError('Nie udało się usunąć wydatku: ' + error.message)
			console.error('Błąd podczas usuwania wydatku:', error)
		} finally {
			setIsDeleting(false)
			setLoadingStates(prev => ({ ...prev, [expenseId]: false }))
		}
	}

	const getCategoryById = categoryId => {
		if (!categoryId) {
			return {
				name: 'Brak kategorii',
				color: '#999',
			}
		}

		// Jeśli categoryId jest obiektem (spopulowane), zwróć go bezpośrednio
		if (typeof categoryId === 'object' && categoryId._id) {
			return categoryId
		}

		// W przeciwnym razie szukaj kategorii po ID
		return (
			categories.find(cat => cat._id === categoryId) || {
				name: 'Brak kategorii',
				color: '#999',
			}
		)
	}

	const formatDate = dateString => {
		const date = new Date(dateString)
		return date.toLocaleDateString('pl-PL', {
			year: 'numeric',
			month: 'long',
			day: 'numeric',
		})
	}

	const formatCurrency = amount => {
		return `${amount.toFixed(2)} zł`
	}

	const ExpensesFilters = ({
		selectedCategory,
		setSelectedCategory,
		selectedDateRange,
		setSelectedDateRange,
		sortBy,
		setSortBy,
		searchQuery,
		setSearchQuery,
		categories,
	}) => {
		return (
			<div className={styles.filterSection}>
				<select className={styles.select} value={selectedCategory} onChange={e => setSelectedCategory(e.target.value)}>
					<option value="all">Wszystkie kategorie</option>
					{categories.map(category => (
						<option key={category._id} value={category._id}>
							{category.name}
						</option>
					))}
				</select>

				<select
					className={styles.select}
					value={selectedDateRange}
					onChange={e => setSelectedDateRange(e.target.value)}>
					{dateRanges.map(range => (
						<option key={range.id} value={range.id}>
							{range.name}
						</option>
					))}
				</select>

				<select className={styles.select} value={sortBy} onChange={e => setSortBy(e.target.value)}>
					{sortOptions.map(option => (
						<option key={option.id} value={option.id}>
							{option.name}
						</option>
					))}
				</select>

				<Input
					type="text"
					placeholder="Szukaj wydatków..."
					value={searchQuery}
					onChange={e => setSearchQuery(e.target.value)}
				/>
			</div>
		)
	}

	const ExpenseCard = ({ expense, onDelete }) => {
		const category = getCategoryById(expense.categoryId)
		const isDeleting = loadingStates[expense._id]

		return (
			<Card className={styles.expenseCard}>
				<div className={styles.expenseAmount}>{formatCurrency(expense.amount)}</div>
				<div className={styles.categoryBadge} style={{ backgroundColor: category?.color || '#999' }}>
					{category?.name || 'Brak kategorii'}
				</div>
				<div className={styles.expenseDate}>{formatDate(expense.date)}</div>
				<div className={styles.expenseTitle}>{expense.title}</div>
				<div className={styles.expenseActions}>
					<Button
						variant="outline"
						size="small"
						onClick={() => router.push(`/expenses/${expense._id}`)}
						className={styles.actionButton}>
						Szczegóły
					</Button>
					<Button
						variant="danger"
						size="small"
						onClick={() => onDelete(expense._id)}
						disabled={isDeleting}
						className={styles.actionButton}>
						{isDeleting ? 'Usuwanie...' : 'Usuń'}
					</Button>
				</div>
			</Card>
		)
	}

	if (status === 'loading' || isLoading) {
		return (
			<div className={styles.loadingContainer}>
				<div className={styles.loadingSpinner}></div>
				<p className={styles.loadingText}>Ładowanie wydatków...</p>
			</div>
		)
	}

	if (!session) {
		router.push('/auth/signin')
		return null
	}

	const filteredExpenses = expenses
		.filter(expense => {
			// Filtrowanie po wyszukiwaniu
			if (searchQuery) {
				return expense.title.toLowerCase().includes(searchQuery.toLowerCase())
			}
			return true
		})
		.filter(expense => {
			// Filtrowanie po kategorii
			if (selectedCategory !== 'all') {
				return expense.categoryId === selectedCategory
			}
			return true
		})
		.filter(expense => {
			// Filtrowanie po dacie
			if (selectedDateRange !== 'all') {
				const now = new Date()
				let dateFrom, dateTo

				if (selectedDateRange === 'today') {
					dateFrom = new Date(now.getFullYear(), now.getMonth(), now.getDate())
					dateTo = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59)
				} else if (selectedDateRange === 'week') {
					dateFrom = new Date(now.getFullYear(), now.getMonth(), now.getDate() - now.getDay())
					dateTo = new Date(now.getFullYear(), now.getMonth(), now.getDate() + (6 - now.getDay()), 23, 59, 59)
				} else if (selectedDateRange === 'month') {
					dateFrom = new Date(now.getFullYear(), now.getMonth(), 1)
					dateTo = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59)
				} else if (selectedDateRange === 'year') {
					dateFrom = new Date(now.getFullYear(), 0, 1)
					dateTo = new Date(now.getFullYear(), 11, 31, 23, 59, 59)
				}

				const expenseDate = new Date(expense.date)
				return expenseDate >= dateFrom && expenseDate <= dateTo
			}
			return true
		})
		.sort((a, b) => {
			// Sortowanie
			if (sortBy === 'date-desc') {
				return new Date(b.date) - new Date(a.date)
			} else if (sortBy === 'date-asc') {
				return new Date(a.date) - new Date(b.date)
			} else if (sortBy === 'amount-desc') {
				return b.amount - a.amount
			} else if (sortBy === 'amount-asc') {
				return a.amount - b.amount
			}
			return 0
		})

	console.log('Stan komponentu:', {
		expenses,
		categories,
		isLoading,
		error,
		filteredExpenses: expenses.filter(expense => {
			if (searchQuery) {
				return expense.title.toLowerCase().includes(searchQuery.toLowerCase())
			}
			return true
		}),
	})

	return (
		<div className={styles.container}>
			<div className={styles.header}>
				<h1>Wydatki</h1>
				<Button variant="contained" onClick={() => router.push('/expenses/add')}>
					Dodaj wydatek
				</Button>
			</div>

			<ExpensesFilters
				selectedCategory={selectedCategory}
				setSelectedCategory={setSelectedCategory}
				selectedDateRange={selectedDateRange}
				setSelectedDateRange={setSelectedDateRange}
				sortBy={sortBy}
				setSortBy={setSortBy}
				searchQuery={searchQuery}
				setSearchQuery={setSearchQuery}
				categories={categories}
			/>

			{error && <div className={styles.error}>{error}</div>}

			<div className={styles.expensesList}>
				{filteredExpenses.length > 0 ? (
					filteredExpenses.map(expense => (
						<ExpenseCard key={expense._id} expense={expense} onDelete={handleDeleteExpense} />
					))
				) : (
					<div className={styles.emptyState}>
						<p className={styles.emptyStateText}>
							{searchQuery || selectedCategory !== 'all' || selectedDateRange !== 'all'
								? 'Nie znaleziono wydatków spełniających kryteria wyszukiwania'
								: 'Nie masz jeszcze żadnych wydatków'}
						</p>
						{(searchQuery || selectedCategory !== 'all' || selectedDateRange !== 'all') && (
							<Button
								variant="outline"
								onClick={() => {
									setSearchQuery('')
									setSelectedCategory('all')
									setSelectedDateRange('all')
									setSortBy('date-desc')
								}}
								className={styles.resetButton}>
								Resetuj filtry
							</Button>
						)}
					</div>
				)}
			</div>
		</div>
	)
}
