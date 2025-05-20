import React, { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/router'
import Card from '../../components/common/Card'
import Button from '../../components/common/Button'
import styles from './SharedBudgets.module.css'

export default function SharedBudgets() {
	const { data: session } = useSession()
	const router = useRouter()
	const [budgets, setBudgets] = useState([])
	const [loading, setLoading] = useState(true)

	useEffect(() => {
		if (session) {
			fetchBudgets()
		}
	}, [session])

	const fetchBudgets = async () => {
		try {
			const response = await fetch('/api/shared-budgets')
			const data = await response.json()
			if (data.success) {
				setBudgets(data.data)
			}
		} catch (error) {
			console.error('Błąd podczas pobierania budżetów:', error)
		} finally {
			setLoading(false)
		}
	}

	return (
		<div className={styles.container}>
			<div className={styles.header}>
				<h1 className={styles.title}>Wspólne Budżety</h1>
				<Button onClick={() => router.push('/shared-budgets/create')}>Utwórz nowy budżet</Button>
			</div>

			<div className={styles.content}>
				{loading ? (
					<p>Ładowanie...</p>
				) : budgets.length === 0 ? (
					<Card>
						<p>Nie masz jeszcze żadnych wspólnych budżetów</p>
					</Card>
				) : (
					budgets.map(budget => (
						<Card key={budget._id} className={styles.budgetCard}>
							<h2 className={styles.budgetName}>{budget.name}</h2>
							<p className={styles.budgetDescription}>{budget.description}</p>
							<p className={styles.budgetAmount}>Budżet miesięczny: {budget.monthlyBudget.toFixed(2)} zł</p>
						</Card>
					))
				)}
			</div>
		</div>
	)
}
