import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/router'
import Card from '../../../components/common/Card'
import Button from '../../../components/common/Button'
import styles from './Accept.module.css'

export default function AcceptInvitation() {
	const router = useRouter()
	const { token } = router.query
	const [loading, setLoading] = useState(true)
	const [error, setError] = useState('')
	const [budgetDetails, setBudgetDetails] = useState(null)

	useEffect(() => {
		if (token) {
			fetchInvitationDetails()
		}
	}, [token])

	const fetchInvitationDetails = async () => {
		try {
			const response = await fetch(`/api/shared-budgets/invitations/${token}`)
			const data = await response.json()

			if (data.success) {
				setBudgetDetails(data.data)
			} else {
				setError(data.message)
			}
		} catch (error) {
			setError('Nie udało się pobrać szczegółów zaproszenia')
		} finally {
			setLoading(false)
		}
	}

	const handleAccept = async () => {
		try {
			setLoading(true)
			const response = await fetch(`/api/shared-budgets/invitations/${token}/accept`, {
				method: 'POST',
			})
			const data = await response.json()

			if (data.success) {
				router.push(`/shared-budgets/${data.data.budgetId}`)
			} else {
				setError(data.message)
			}
		} catch (error) {
			setError('Nie udało się zaakceptować zaproszenia')
		} finally {
			setLoading(false)
		}
	}

	if (loading) return <p className={styles.loadingText}>Ładowanie...</p>
	if (error) return <p className={styles.errorText}>{error}</p>

	return (
		<div className={styles.container}>
			<Card className={styles.card}>
				<h1 className={styles.title}>Zaproszenie do wspólnego budżetu</h1>
				<h2 className={styles.budgetName}>{budgetDetails?.name}</h2>
				<p className={styles.description}>
					Zostałeś zaproszony do wspólnego budżetu z udziałem {budgetDetails?.contributionRatio}%
				</p>
				<div className={styles.buttonGroup}>
					<Button onClick={handleAccept} className={styles.acceptButton}>
						Akceptuj zaproszenie
					</Button>
					<Button onClick={() => router.push('/shared-budgets')} variant="outline">
						Odrzuć
					</Button>
				</div>
			</Card>
		</div>
	)
}
