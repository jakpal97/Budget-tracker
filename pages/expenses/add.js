import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/router'
import { useSession } from 'next-auth/react'
import Card from '../../components/common/Card'
import Button from '../../components/common/Button'
import Input from '../../components/common/Input'
import styles from './AddExpense.module.css'

export default function AddExpensePage() {
	const router = useRouter()
	const { data: session, status } = useSession()
	const [categories, setCategories] = useState([])
	const [isLoading, setIsLoading] = useState(false)
	const [isSaving, setIsSaving] = useState(false)
	const [error, setError] = useState(null)
	const [sharedBudgets, setSharedBudgets] = useState([])

	const [formData, setFormData] = useState({
		title: '',
		amount: '',
		date: new Date().toISOString().split('T')[0],
		categoryId: '',
		notes: '',
		paymentMethod: 'other',
		items: [],
		type: 'personal',
		sharedBudgetId: '',
	})

	const paymentMethods = [
		{ id: 'cash', name: 'Gotówka' },
		{ id: 'card', name: 'Karta' },
		{ id: 'transfer', name: 'Przelew' },
		{ id: 'other', name: 'Inna' },
	]

	useEffect(() => {
		if (session) {
			fetchCategories()
			fetchSharedBudgets()
		}
	}, [session])

	const fetchCategories = async () => {
		setIsLoading(true)
		try {
			const response = await fetch('/api/categories')
			const data = await response.json()

			if (data.success) {
				setCategories(data.data)
			} else {
				throw new Error(data.message || 'Nie udało się pobrać kategorii')
			}
		} catch (error) {
			console.error('Błąd podczas pobierania kategorii:', error)
			setError('Nie udało się pobrać kategorii wydatków')
		} finally {
			setIsLoading(false)
		}
	}

	const fetchSharedBudgets = async () => {
		try {
			const response = await fetch('/api/shared-budgets')
			const data = await response.json()
			if (data.success) {
				setSharedBudgets(data.data)
			}
		} catch (error) {
			console.error('Błąd podczas pobierania budżetów wspólnych:', error)
		}
	}

	const handleInputChange = (name, value) => {
		setFormData(prev => ({
			...prev,
			[name]: value,
		}))
	}

	const handleItemChange = (index, field, value) => {
		const updatedItems = [...formData.items]
		updatedItems[index] = {
			...updatedItems[index],
			[field]: field === 'price' || field === 'quantity' ? parseFloat(value) : value,
		}

		setFormData({
			...formData,
			items: updatedItems,
		})
	}

	const handleAddItem = () => {
		setFormData({
			...formData,
			items: [...formData.items, { name: '', price: 0, quantity: 1 }],
		})
	}

	const handleRemoveItem = index => {
		const updatedItems = [...formData.items]
		updatedItems.splice(index, 1)

		setFormData({
			...formData,
			items: updatedItems,
		})
	}

	const handleSave = async () => {
		setIsSaving(true)
		setError(null)

		try {
			if (!formData.title || !formData.amount || !formData.date) {
				throw new Error('Wypełnij wszystkie wymagane pola')
			}

			const expenseData = {
				...formData,
				amount: parseFloat(formData.amount),
				type: 'personal',
			}

			const response = await fetch('/api/expenses', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
				},
				body: JSON.stringify(expenseData),
			})

			if (!response.ok) {
				throw new Error('Nie udało się dodać wydatku')
			}

			const data = await response.json()

			if (data.success) {
				if (typeof window !== 'undefined') {
					localStorage.setItem('dashboardRefresh', Date.now().toString())
				}
				router.push('/expenses')
			} else {
				throw new Error(data.message || 'Wystąpił błąd')
			}
		} catch (error) {
			console.error('Błąd podczas dodawania wydatku:', error)
			setError(error.message)
		} finally {
			setIsSaving(false)
		}
	}

	const handleCancel = () => {
		router.push('/expenses')
	}

	if (status === 'loading' || isLoading) {
		return (
			<div className={styles.loadingContainer}>
				<div className={styles.loadingSpinner}></div>
				<p className={styles.loadingText}>Ładowanie...</p>
			</div>
		)
	}

	if (!session) {
		router.push('/auth/signin')
		return null
	}

	return (
		<div className={styles.container}>
			<div className={styles.header}>
				<Button variant="outline" onClick={handleCancel} size="small">
					Anuluj
				</Button>
				<h1 className={styles.headerTitle}>Dodaj nowy wydatek</h1>
				<div className={styles.spacer}></div>
			</div>

			<Card className={styles.card}>
				<form onSubmit={e => e.preventDefault()} className={styles.form}>
					<div className={styles.formSection}>
						<h2 className={styles.sectionTitle}>Podstawowe informacje</h2>

						<div className={styles.formGroup}>
							<label className={styles.label} htmlFor="type">
								Typ wydatku
							</label>
							<select
								id="type"
								className={styles.select}
								value={formData.type}
								onChange={e => handleInputChange('type', e.target.value)}>
								<option value="personal">Osobisty</option>
								<option value="shared">Wspólny</option>
							</select>
						</div>

						{formData.type === 'shared' && (
							<div className={styles.formGroup}>
								<label className={styles.label} htmlFor="sharedBudget">
									Budżet wspólny
								</label>
								<select
									id="sharedBudget"
									className={styles.select}
									value={formData.sharedBudgetId}
									onChange={e => handleInputChange('sharedBudgetId', e.target.value)}>
									<option value="">Wybierz budżet</option>
									{sharedBudgets.map(budget => (
										<option key={budget._id} value={budget._id}>
											{budget.name}
										</option>
									))}
								</select>
							</div>
						)}

						<div className={styles.formGroup}>
							<label className={styles.label} htmlFor="title">
								Tytuł
							</label>
							<Input
								id="title"
								type="text"
								value={formData.title}
								onChange={e => handleInputChange('title', e.target.value)}
								placeholder="Wpisz tytuł wydatku"
								required
							/>
						</div>

						<div className={styles.formGroup}>
							<label className={styles.label} htmlFor="amount">
								Kwota
							</label>
							<Input
								id="amount"
								type="number"
								value={formData.amount}
								onChange={e => handleInputChange('amount', e.target.value)}
								placeholder="0.00"
								keyboardType="numeric"
								required
							/>
						</div>

						<div className={styles.formGroup}>
							<label className={styles.label} htmlFor="date">
								Data
							</label>
							<Input
								id="date"
								type="date"
								value={formData.date}
								onChange={e => handleInputChange('date', e.target.value)}
								required
							/>
						</div>

						<div className={styles.formGroup}>
							<label className={styles.label} htmlFor="category">
								Kategoria
							</label>
							<select
								id="category"
								className={styles.select}
								value={formData.categoryId}
								onChange={e => handleInputChange('categoryId', e.target.value)}>
								<option value="">Wybierz kategorię</option>
								{categories.map(category => (
									<option key={category._id} value={category._id}>
										{category.name}
									</option>
								))}
							</select>
						</div>

						<div className={styles.formGroup}>
							<label className={styles.label} htmlFor="paymentMethod">
								Metoda płatności
							</label>
							<select
								id="paymentMethod"
								className={styles.select}
								value={formData.paymentMethod}
								onChange={e => handleInputChange('paymentMethod', e.target.value)}>
								{paymentMethods.map(method => (
									<option key={method.id} value={method.id}>
										{method.name}
									</option>
								))}
							</select>
						</div>

						<div className={styles.formGroup}>
							<label className={styles.label} htmlFor="notes">
								Notatki
							</label>
							<textarea
								id="notes"
								className={styles.textarea}
								value={formData.notes}
								onChange={e => handleInputChange('notes', e.target.value)}
								placeholder="Dodatkowe informacje..."
								rows={4}
							/>
						</div>
					</div>

					{error && <p className={styles.error}>{error}</p>}

					<div className={styles.actionButtons}>
						<Button variant="outline" onClick={handleCancel} disabled={isSaving}>
							Anuluj
						</Button>
						<Button onClick={handleSave} disabled={isSaving}>
							{isSaving ? 'Zapisywanie...' : 'Zapisz'}
						</Button>
					</div>
				</form>
			</Card>
		</div>
	)
}
