import React, { useState, useEffect } from 'react'
import styles from '../styles/ExpenseForm.module.css'

export default function ExpenseForm({ onSubmit, initialData = null }) {
	const [formData, setFormData] = useState({
		title: '',
		amount: '',
		date: new Date().toISOString().split('T')[0],
		category: '',
		type: 'personal',
		sharedBudgetId: '',
		...initialData,
	})
	const [sharedBudgets, setSharedBudgets] = useState([])
	const [isLoading, setIsLoading] = useState(true)

	useEffect(() => {
		fetchSharedBudgets()
	}, [])

	const fetchSharedBudgets = async () => {
		try {
			const response = await fetch('/api/shared-budgets')
			const data = await response.json()
			if (data.success) {
				setSharedBudgets(data.data)
			}
		} catch (error) {
			console.error('Błąd podczas pobierania budżetów wspólnych:', error)
		} finally {
			setIsLoading(false)
		}
	}

	const formatCurrency = amount => {
		if (!amount) return '0.00 zł'
		return Number(amount).toFixed(2) + ' zł'
	}

	const handleSubmit = async e => {
		e.preventDefault()

		const submitData = {
			...formData,
			amount: parseFloat(formData.amount),
			type: formData.type,
			sharedBudgetId: formData.type === 'shared' ? formData.sharedBudgetId : null,
		}

		onSubmit(submitData)
	}

	return (
		<form onSubmit={handleSubmit} className={styles.form}>
			<div className={styles.formGroup}>
				<label>Sklep/Miejsce *</label>
				<input
					type="text"
					value={formData.title}
					onChange={e => setFormData({ ...formData, title: e.target.value })}
					placeholder="Nazwa sklepu lub miejsca"
					required
					className={styles.input}
				/>
			</div>

			<div className={styles.formGroup}>
				<label>Kwota całkowita *</label>
				<input
					type="number"
					value={formData.amount}
					onChange={e => setFormData({ ...formData, amount: e.target.value })}
					placeholder="0.00"
					step="0.01"
					required
					className={styles.input}
				/>
			</div>

			<div className={styles.formGroup}>
				<label>Data *</label>
				<input
					type="date"
					value={formData.date}
					onChange={e => setFormData({ ...formData, date: e.target.value })}
					required
					className={styles.input}
				/>
			</div>

			<div className={styles.formGroup}>
				<label>Typ wydatku *</label>
				<select
					value={formData.type}
					onChange={e => setFormData({ ...formData, type: e.target.value })}
					required
					className={styles.select}>
					<option value="personal">Wydatek osobisty</option>
					<option value="shared">Wydatek wspólny</option>
				</select>
			</div>

			{formData.type === 'shared' && (
				<div className={styles.formGroup}>
					<label>Budżet wspólny *</label>
					<select
						value={formData.sharedBudgetId}
						onChange={e => setFormData({ ...formData, sharedBudgetId: e.target.value })}
						required
						className={styles.select}
						disabled={isLoading}>
						<option value="">Wybierz budżet wspólny</option>
						{sharedBudgets.map(budget => (
							<option key={budget._id} value={budget._id}>
								{budget.name} (Limit: {formatCurrency(budget.monthlyBudget)})
							</option>
						))}
					</select>
				</div>
			)}

			<div className={styles.formGroup}>
				<label>Kategoria</label>
				<select
					value={formData.category}
					onChange={e => setFormData({ ...formData, category: e.target.value })}
					className={styles.select}>
					<option value="">Wybierz kategorię</option>
					<option value="food">Żywność</option>
					<option value="transport">Transport</option>
					<option value="entertainment">Rozrywka</option>
					{/* Dodaj więcej kategorii */}
				</select>
			</div>

			<div className={styles.buttonGroup}>
				<button type="submit" className={styles.submitButton}>
					Zapisz paragon
				</button>
			</div>
		</form>
	)
}
