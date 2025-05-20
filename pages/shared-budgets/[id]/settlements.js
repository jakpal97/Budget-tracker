import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/router'
import { useSession } from 'next-auth/react'
import Card from '../../../components/common/Card'
import Button from '../../../components/common/Button'
import styles from './Settlements.module.css'

export default function SettlementsPage() {
	const router = useRouter()
	const { id } = router.query
	const { data: session, status } = useSession()
	const [settlements, setSettlements] = useState([])
	const [isLoading, setIsLoading] = useState(true)
	const [error, setError] = useState(null)

	useEffect(() => {
		if (session && id) {
			fetchSettlements()
		}
	}, [session, id])

	const fetchSettlements = async () => {
		try {
			const response = await fetch(`/api/shared-budgets/${id}/settlements`)
			const data = await response.json()

			if (data.success) {
				setSettlements(data.data)
			} else {
				throw new Error(data.message)
			}
		} catch (error) {
			setError('Nie udało się pobrać rozliczeń')
			console.error('Błąd podczas pobierania rozliczeń:', error)
		} finally {
			setIsLoading(false)
		}
	}

	const handleExportSettlements = async () => {
		try {
			const response = await fetch(`/api/shared-budgets/${id}/settlements/export`, {
				method: 'POST',
			})

			if (!response.ok) {
				throw new Error('Nie udało się wyeksportować rozliczeń')
			}

			const blob = await response.blob()
			const url = window.URL.createObjectURL(blob)
			const a = document.createElement('a')
			a.href = url
			a.download = 'rozliczenia.csv'
			document.body.appendChild(a)
			a.click()
			window.URL.revokeObjectURL(url)
			document.body.removeChild(a)
		} catch (error) {
			setError('Nie udało się wyeksportować rozliczeń')
			console.error('Błąd podczas eksportowania rozliczeń:', error)
		}
	}

	const handleSendReminder = async userId => {
		try {
			const response = await fetch(`/api/shared-budgets/${id}/settlements/remind`, {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
				},
				body: JSON.stringify({ userId }),
			})

			const data = await response.json()

			if (data.success) {
				alert('Przypomnienie zostało wysłane')
			} else {
				throw new Error(data.message)
			}
		} catch (error) {
			setError('Nie udało się wysłać przypomnienia')
			console.error('Błąd podczas wysyłania przypomnienia:', error)
		}
	}

	if (status === 'loading' || isLoading) {
		return (
			<div className={styles.loadingContainer}>
				<div className={styles.loadingSpinner}></div>
				<p className={styles.loadingText}>Ładowanie rozliczeń...</p>
			</div>
		)
	}

	if (!session) {
		router.push('/auth/signin')
		return null
	}

	return (
		<div className={styles.container}>
			<Card className={styles.summaryCard}>
				<h1 className={styles.title}>Rozliczenia</h1>

				{error && (
					<div className={styles.errorContainer}>
						<p className={styles.errorText}>{error}</p>
					</div>
				)}

				{settlements.length > 0 ? (
					<>
						{settlements.map(settlement => (
							<div key={settlement.userId} className={styles.settlementItem}>
								<div className={styles.userInfo}>
									<p className={styles.userName}>{settlement.userName}</p>
									<p className={styles.userEmail}>{settlement.userEmail}</p>
								</div>
								<div className={styles.amountInfo}>
									<p className={styles.amount}>
										{settlement.amount > 0
											? `Do zapłaty: ${settlement.amount.toFixed(2)} zł`
											: `Do otrzymania: ${Math.abs(settlement.amount).toFixed(2)} zł`}
									</p>
									{settlement.amount > 0 && (
										<Button
											onClick={() => handleSendReminder(settlement.userId)}
											variant="outline"
											size="small"
											className={styles.reminderButton}>
											Przypomnij
										</Button>
									)}
								</div>
							</div>
						))}

						<Button onClick={handleExportSettlements} className={styles.exportButton}>
							Eksportuj rozliczenia
						</Button>
					</>
				) : (
					<p className={styles.emptyText}>Brak rozliczeń do wyświetlenia</p>
				)}
			</Card>
		</div>
	)
}
