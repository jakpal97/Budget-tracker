import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/router'
import { useSession } from 'next-auth/react'
import Card from '../../components/common/Card'
import Button from '../../components/common/Button'

export default function ExpenseDetailsPage() {
	const router = useRouter()
	const { id } = router.query
	const { data: session, status } = useSession()
	const [receipt, setReceipt] = useState(null)
	const [categories, setCategories] = useState([])
	const [isLoading, setIsLoading] = useState(true)
	const [isDeleting, setIsDeleting] = useState(false)
	const [error, setError] = useState(null)

	// Pobieranie danych paragonu
	useEffect(() => {
		// Czekamy na załadowanie routera i autentykację
		if (!router.isReady || status !== 'authenticated') {
			return
		}

		// Sprawdzamy, czy mamy ID
		if (!id) {
			setError('Brak identyfikatora paragonu')
			setIsLoading(false)
			return
		}

		console.log('Rozpoczynam pobieranie danych paragonu:', id)
		fetchReceipt()
		fetchCategories()
	}, [router.isReady, status, id])

	const fetchReceipt = async () => {
		try {
			// Sprawdzamy, czy ID jest poprawne
			if (!id || typeof id !== 'string' || id.trim() === '') {
				throw new Error('Nieprawidłowy identyfikator wydatku')
			}

			console.log('Wysyłam zapytanie o wydatek:', id)
			const response = await fetch(`/api/expenses/${id}`)
			console.log('Otrzymano odpowiedź:', response.status)

			const data = await response.json()
			console.log('Otrzymano dane:', data)

			if (!response.ok) {
				throw new Error(data.message || 'Nie udało się pobrać danych wydatku')
			}

			if (!data.success) {
				throw new Error(data.message || 'Wystąpił błąd')
			}

			setReceipt(data.data)
			setError(null)
		} catch (error) {
			console.error('Błąd podczas pobierania wydatku:', error)
			setError(error.message || 'Nie udało się pobrać danych wydatku')
			setReceipt(null)
		} finally {
			setIsLoading(false)
		}
	}

	const fetchCategories = async () => {
		try {
			const response = await fetch('/api/categories')
			const data = await response.json()

			if (!response.ok) {
				throw new Error(data.message || 'Nie udało się pobrać kategorii')
			}

			if (data.success) {
				setCategories(data.data)
			} else {
				throw new Error(data.message || 'Wystąpił błąd')
			}
		} catch (error) {
			console.error('Błąd podczas pobierania kategorii:', error)
			// Nie ustawiamy błędu, ponieważ kategorie nie są krytyczne dla wyświetlenia paragonu
		}
	}

	// Obsługa usuwania paragonu
	const handleDelete = async () => {
		if (!confirm('Czy na pewno chcesz usunąć ten paragon?')) {
			return
		}

		setIsDeleting(true)
		setError(null)

		try {
			const response = await fetch(`/api/receipts/${id}`, {
				method: 'DELETE',
			})

			const data = await response.json()

			if (!response.ok) {
				throw new Error(data.message || 'Nie udało się usunąć paragonu')
			}

			if (data.success) {
				router.push('/expenses')
			} else {
				throw new Error(data.message || 'Wystąpił błąd podczas usuwania paragonu')
			}
		} catch (error) {
			console.error('Błąd podczas usuwania paragonu:', error)
			setError(error.message || 'Nie udało się usunąć paragonu')
		} finally {
			setIsDeleting(false)
		}
	}

	// Funkcje pomocnicze
	const formatCurrency = amount => {
		return amount.toFixed(2).replace(/\d(?=(\d{3})+\.)/g, '$& ') + ' zł'
	}

	const formatDate = dateString => {
		const date = new Date(dateString)
		return date.toLocaleDateString('pl-PL', {
			year: 'numeric',
			month: 'long',
			day: 'numeric',
			weekday: 'long',
		})
	}

	const getCategoryById = categoryId => {
		if (!categoryId) return null
		return categories.find(cat => cat._id === categoryId) || null
	}

	// Obsługa stanu ładowania
	if (!router.isReady || status === 'loading' || isLoading) {
		return (
			<div className="loadingContainer">
				<div className="loadingSpinner"></div>
				<p className="loadingText">Ładowanie...</p>
			</div>
		)
	}

	// Kontrola sesji
	if (status === 'unauthenticated') {
		router.push('/auth/signin')
		return null
	}

	// Obsługa błędów
	if (error) {
		return (
			<div className="container">
				<Card className="errorCard">
					<h2 className="errorTitle">Wystąpił błąd</h2>
					<p className="errorText">{error}</p>
					<div className="errorActions">
						<Button onClick={() => router.push('/expenses')} variant="outline">
							Wróć do listy wydatków
						</Button>
						<Button
							onClick={() => {
								setError(null)
								setIsLoading(true)
								fetchReceipt()
							}}>
							Spróbuj ponownie
						</Button>
					</div>
				</Card>
			</div>
		)
	}

	// Obsługa braku danych
	if (!receipt) {
		return (
			<div className="container">
				<Card>
					<p className="emptyText">Nie znaleziono paragonu</p>
					<Button onClick={() => router.push('/expenses')} className="mt-4">
						Wróć do listy wydatków
					</Button>
				</Card>
			</div>
		)
	}

	// Znajdź kategorię paragonu
	const category = getCategoryById(receipt.categoryId)

	return (
		<div className="container">
			<div className="header">
				<Button variant="outline" onClick={() => router.push('/expenses')} size="small">
					Powrót
				</Button>
				<h1 className="headerTitle">Szczegóły paragonu</h1>
				<div style={{ width: '70px' }}></div>
			</div>

			<Card>
				<div className="receiptHeader">
					<h2 className="storeName">{receipt.title}</h2>
					<p className="receiptDate">{formatDate(receipt.date)}</p>
					{category && (
						<div className="categoryTag">
							<div className="categoryDot" style={{ backgroundColor: category.color }}></div>
							<span className="categoryName">{category.name}</span>
						</div>
					)}
				</div>

				<div className="receiptAmount">
					<span className="receiptAmountLabel">Kwota całkowita:</span>
					<span className="receiptAmountValue">{formatCurrency(receipt.amount)}</span>
				</div>

				{receipt.type === 'shared' && (
					<div className="receiptDetailsSection">
						<h3 className="sectionTitle">Typ wydatku</h3>
						<p className="expenseType">Wydatek współdzielony</p>
					</div>
				)}

				{receipt.note && (
					<div className="receiptDetailsSection">
						<h3 className="sectionTitle">Notatka</h3>
						<p className="note">{receipt.note}</p>
					</div>
				)}

				<div className="actionButtons">
					<Button
						variant="outline"
						onClick={() => router.push(`/expenses/${id}/edit`)}
						className="editButton"
						disabled={isDeleting}>
						Edytuj
					</Button>
					<Button variant="danger" onClick={handleDelete} className="deleteButton" disabled={isDeleting}>
						{isDeleting ? 'Usuwanie...' : 'Usuń'}
					</Button>
				</div>
			</Card>

			<style jsx>{`
				.container {
					padding: 20px;
					max-width: 800px;
					margin: 0 auto;
				}

				.header {
					display: flex;
					justify-content: space-between;
					align-items: center;
					margin-bottom: 24px;
				}

				.headerTitle {
					font-size: 1.5rem;
					font-weight: 600;
					color: #2d3748;
					margin: 0;
				}

				.loadingContainer {
					display: flex;
					flex-direction: column;
					align-items: center;
					justify-content: center;
					min-height: 300px;
				}

				.loadingSpinner {
					width: 40px;
					height: 40px;
					border: 3px solid rgba(52, 152, 219, 0.1);
					border-radius: 50%;
					border-top-color: #3498db;
					animation: spin 1s linear infinite;
				}

				@keyframes spin {
					to {
						transform: rotate(360deg);
					}
				}

				.loadingText {
					margin-top: 16px;
					color: #3498db;
					font-size: 1.1rem;
				}

				.receiptHeader {
					margin-bottom: 24px;
				}

				.storeName {
					font-size: 1.25rem;
					font-weight: 600;
					color: #2d3748;
					margin: 0 0 8px 0;
				}

				.receiptDate {
					color: #718096;
					font-size: 0.875rem;
					margin: 0 0 12px 0;
				}

				.categoryTag {
					display: inline-flex;
					align-items: center;
					padding: 4px 12px;
					background: #f7fafc;
					border-radius: 16px;
				}

				.categoryDot {
					width: 8px;
					height: 8px;
					border-radius: 50%;
					margin-right: 8px;
				}

				.categoryName {
					font-size: 0.875rem;
					color: #4a5568;
				}

				.receiptAmount {
					background: #f7fafc;
					padding: 16px;
					border-radius: 8px;
					margin-bottom: 24px;
					display: flex;
					justify-content: space-between;
					align-items: center;
				}

				.receiptAmountLabel {
					color: #4a5568;
					font-size: 0.875rem;
				}

				.receiptAmountValue {
					font-size: 1.25rem;
					font-weight: 600;
					color: #2d3748;
				}

				.receiptDetailsSection {
					margin-bottom: 20px;
				}

				.sectionTitle {
					font-size: 1rem;
					font-weight: 600;
					color: #2d3748;
					margin: 0 0 8px 0;
				}

				.expenseType {
					color: #4a5568;
					margin: 0;
				}

				.note {
					color: #4a5568;
					margin: 0;
					white-space: pre-wrap;
				}

				.actionButtons {
					display: flex;
					gap: 12px;
					margin-top: 24px;
					padding-top: 24px;
					border-top: 1px solid #e2e8f0;
				}

				.editButton {
					flex: 1;
				}

				.deleteButton {
					flex: 1;
				}

				.errorCard {
					text-align: center;
					padding: 24px;
				}

				.errorTitle {
					color: #e53e3e;
					font-size: 1.25rem;
					font-weight: 600;
					margin: 0 0 8px 0;
				}

				.errorText {
					color: #4a5568;
					margin: 0 0 16px 0;
				}

				.emptyText {
					text-align: center;
					color: #718096;
					margin: 0 0 16px 0;
				}

				.mt-4 {
					margin-top: 16px;
				}
			`}</style>
		</div>
	)
}
