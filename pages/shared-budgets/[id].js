import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/router'
import Card from '../../components/common/Card'
import Button from '../../components/common/Button'
import styles from '../../styles/SharedBudget.module.css'

export default function SharedBudgetDetails() {
	const router = useRouter()
	const { id } = router.query
	const [budget, setBudget] = useState(null)
	const [loading, setLoading] = useState(true)
	const [error, setError] = useState(null)

	useEffect(() => {
		if (id) {
			fetchBudgetDetails()
		}
	}, [id])

	const fetchBudgetDetails = async () => {
		try {
			const response = await fetch(`/api/shared-budgets/${id}`)
			const data = await response.json()
			if (data.success) {
				setBudget(data.data)
			} else {
				setError(data.message)
			}
		} catch (error) {
			setError('Nie udało się pobrać szczegółów budżetu')
		} finally {
			setLoading(false)
		}
	}

	if (loading) return <div className={styles.loadingText}>Ładowanie...</div>
	if (error) return <div className={styles.errorText}>{error}</div>
	if (!budget) return <div className={styles.errorText}>Nie znaleziono budżetu</div>

	return (
		<div className={styles.container}>
			<Card className={styles.header}>
				<h1 className={styles.title}>{budget.name}</h1>
				<p className={styles.description}>{budget.description}</p>
				<p className={styles.budget}>Budżet miesięczny: {budget.monthlyBudget.toFixed(2)} zł</p>
			</Card>

			<Card className={styles.section}>
				<h2 className={styles.sectionTitle}>Członkowie ({budget.members.length})</h2>
				{budget.members.map((member, index) => (
					<div key={index} className={styles.memberItem}>
						<p className={styles.memberName}>{member.userId.name || 'Użytkownik'}</p>
						<p className={styles.memberRole}>
							{member.role === 'owner' ? 'Właściciel' : member.role === 'editor' ? 'Edytor' : 'Przeglądający'}
						</p>
						<p className={styles.memberShare}>Udział: {member.contributionRatio}%</p>
					</div>
				))}
				<Button onClick={() => router.push(`/shared-budgets/${id}/invite`)} className={styles.inviteButton}>
					Zaproś osobę
				</Button>
			</Card>
		</div>
	)
}
