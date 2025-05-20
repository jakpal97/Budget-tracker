import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/router'
import { useSession } from 'next-auth/react'
import Card from '../../../components/common/Card'
import Button from '../../../components/common/Button'
import styles from '../../../styles/ExpenseEdit.module.css'

export default function ExpenseEditPage() {
	const router = useRouter()
	const { id } = router.query
	const { data: session, status } = useSession()
	const [expense, setExpense] = useState(null)
	const [categories, setCategories] = useState([])
	const [isLoading, setIsLoading] = useState(true)
	const [isSaving, setIsSaving] = useState(false)
	const [error, setError] = useState(null)

	// Form state
	const [title, setTitle] = useState('')
	const [amount, setAmount] = useState('')
	const [date, setDate] = useState('')
	const [categoryId, setCategoryId] = useState('')
	const [note, setNote] = useState('')

	useEffect(() => {
		if (!router.isReady || status !== 'authenticated') {
			return
		}

		if (!id) {
			setError('Brak identyfikatora wydatku')
			setIsLoading(false)
			return
		}

		fetchExpense()
		fetchCategories()
	}, [router.isReady, status, id])

	const fetchExpense = async () => {
		try {
			const response = await fetch(`/api/expenses/${id}`)
			const data = await response.json()

			if (!response.ok) {
				throw new Error(data.message || 'Nie udało się pobrać danych wydatku')
			}

			if (!data.success) {
				throw new Error(data.message || 'Wystąpił błąd')
			}

			setExpense(data.data)
			// Inicjalizacja formularza danymi wydatku
			setTitle(data.data.title)
			setAmount(data.data.amount.toString())
			setDate(new Date(data.data.date).toISOString().split('T')[0])
			setCategoryId(data.data.categoryId?._id || '')
			setNote(data.data.note || '')
			setError(null)
		} catch (error) {
			console.error('Błąd podczas pobierania wydatku:', error)
			setError(error.message || 'Nie udało się pobrać danych wydatku')
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
		}
	}

	const handleSubmit = async e => {
		e.preventDefault()
		setIsSaving(true)
		setError(null)

		try {
			const response = await fetch(`/api/expenses/${id}`, {
				method: 'PUT',
				headers: {
					'Content-Type': 'application/json',
				},
				body: JSON.stringify({
					title,
					amount: parseFloat(amount),
					date,
					categoryId,
					note,
				}),
			})

			const data = await response.json()

			if (!response.ok) {
				throw new Error(data.message || 'Nie udało się zaktualizować wydatku')
			}

			if (data.success) {
				router.push(`/expenses/${id}`)
			} else {
				throw new Error(data.message || 'Wystąpił błąd podczas aktualizacji wydatku')
			}
		} catch (error) {
			console.error('Błąd podczas aktualizacji wydatku:', error)
			setError(error.message || 'Nie udało się zaktualizować wydatku')
		} finally {
			setIsSaving(false)
		}
	}

	if (!router.isReady || status === 'loading' || isLoading) {
		return (
			<div className={styles.loadingContainer}>
				<div className={styles.loadingSpinner}></div>
				<p className={styles.loadingText}>Ładowanie...</p>
			</div>
		)
	}

	if (status === 'unauthenticated') {
		router.push('/auth/signin')
		return null
	}

	if (error) {
		return (
			<div className={styles.container}>
				<Card className={styles.errorCard}>
					<h2 className={styles.errorTitle}>Wystąpił błąd</h2>
					<p className={styles.errorText}>{error}</p>
					<div className={styles.errorActions}>
						<Button onClick={() => router.push('/expenses')} variant="outline">
							Wróć do listy wydatków
						</Button>
						<Button onClick={fetchExpense}>Spróbuj ponownie</Button>
					</div>
				</Card>
			</div>
		)
	}

	return (
		<div className={styles.container}>
			<div className={styles.header}>
				<Button variant="outline" onClick={() => router.push(`/expenses/${id}`)} size="small">
					Powrót
				</Button>
				<h1 className={styles.headerTitle}>Edytuj wydatek</h1>
				<div style={{ width: '70px' }}></div>
			</div>

			<Card>
				<form onSubmit={handleSubmit} className={styles.form}>
					<div className={styles.formGroup}>
						<label htmlFor="title" className={styles.label}>
							Tytuł
						</label>
						<input
							type="text"
							id="title"
							value={title}
							onChange={e => setTitle(e.target.value)}
							className={styles.input}
							required
						/>
					</div>

					<div className={styles.formGroup}>
						<label htmlFor="amount" className={styles.label}>
							Kwota
						</label>
						<input
							type="number"
							id="amount"
							value={amount}
							onChange={e => setAmount(e.target.value)}
							className={styles.input}
							step="0.01"
							min="0"
							required
						/>
					</div>

					<div className={styles.formGroup}>
						<label htmlFor="date" className={styles.label}>
							Data
						</label>
						<input
							type="date"
							id="date"
							value={date}
							onChange={e => setDate(e.target.value)}
							className={styles.input}
							required
						/>
					</div>

					<div className={styles.formGroup}>
						<label htmlFor="category" className={styles.label}>
							Kategoria
						</label>
						<select
							id="category"
							value={categoryId}
							onChange={e => setCategoryId(e.target.value)}
							className={styles.select}>
							<option value="">Wybierz kategorię</option>
							{categories.map(category => (
								<option key={category._id} value={category._id}>
									{category.name}
								</option>
							))}
						</select>
					</div>

					<div className={styles.formGroup}>
						<label htmlFor="note" className={styles.label}>
							Notatka
						</label>
						<textarea
							id="note"
							value={note}
							onChange={e => setNote(e.target.value)}
							className={styles.textarea}
							rows={4}
						/>
					</div>

					<div className={styles.formActions}>
						<Button type="button" variant="outline" onClick={() => router.push(`/expenses/${id}`)} disabled={isSaving}>
							Anuluj
						</Button>
						<Button type="submit" disabled={isSaving}>
							{isSaving ? 'Zapisywanie...' : 'Zapisz zmiany'}
						</Button>
					</div>
				</form>
			</Card>
		</div>
	)
}
