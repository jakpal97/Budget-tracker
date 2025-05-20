import React, { useState } from 'react'
import { useRouter } from 'next/router'
import Card from '../../components/common/Card'
import Button from '../../components/common/Button'
import styles from './Create.module.css'

export default function CreateSharedBudget() {
	const router = useRouter()
	const [name, setName] = useState('')
	const [description, setDescription] = useState('')
	const [monthlyBudget, setMonthlyBudget] = useState('')
	const [loading, setLoading] = useState(false)
	const [error, setError] = useState('')

	const handleCreate = async () => {
		if (!name.trim()) {
			setError('Nazwa budżetu jest wymagana')
			return
		}

		try {
			setLoading(true)
			setError('')

			const response = await fetch('/api/shared-budgets', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
				},
				body: JSON.stringify({
					name,
					description,
					monthlyBudget: parseFloat(monthlyBudget) || 0,
				}),
			})

			const data = await response.json()

			if (data.success) {
				router.push('/shared-budgets')
			} else {
				setError(data.message || 'Wystąpił błąd podczas tworzenia budżetu')
			}
		} catch (error) {
			setError('Nie udało się utworzyć budżetu')
		} finally {
			setLoading(false)
		}
	}

	return (
		<div className={styles.container}>
			<Card className={styles.form}>
				<h1 className={styles.title}>Utwórz nowy wspólny budżet</h1>

				<div className={styles.inputGroup}>
					<label htmlFor="name" className={styles.label}>
						Nazwa budżetu*
					</label>
					<input
						id="name"
						className={styles.input}
						value={name}
						onChange={e => setName(e.target.value)}
						placeholder="np. Budżet domowy"
						type="text"
					/>
				</div>

				<div className={styles.inputGroup}>
					<label htmlFor="description" className={styles.label}>
						Opis (opcjonalny)
					</label>
					<textarea
						id="description"
						className={`${styles.input} ${styles.textArea}`}
						value={description}
						onChange={e => setDescription(e.target.value)}
						placeholder="Opisz cel tego budżetu"
						rows={4}
					/>
				</div>

				<div className={styles.inputGroup}>
					<label htmlFor="budget" className={styles.label}>
						Miesięczny budżet (zł)
					</label>
					<input
						id="budget"
						className={styles.input}
						value={monthlyBudget}
						onChange={e => setMonthlyBudget(e.target.value)}
						placeholder="0.00"
						type="number"
						step="0.01"
						min="0"
					/>
				</div>

				{error && <p className={styles.errorText}>{error}</p>}

				<Button onClick={handleCreate} disabled={loading}>
					{loading ? 'Tworzenie...' : 'Utwórz budżet'}
				</Button>
			</Card>
		</div>
	)
}
