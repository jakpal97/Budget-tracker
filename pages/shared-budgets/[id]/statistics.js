import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/router'
import { useSession } from 'next-auth/react'
import Card from '../../../components/common/Card'
import { Pie } from 'react-chartjs-2'
import styles from './Statistics.module.css'

const chartColors = ['#FF6384', '#36A2EB', '#FFCE56', '#4BC0C0', '#9966FF', '#FF9F40', '#FF6384']

export default function StatisticsPage() {
	const router = useRouter()
	const { id } = router.query
	const { data: session, status } = useSession()
	const [statistics, setStatistics] = useState(null)
	const [isLoading, setIsLoading] = useState(true)
	const [error, setError] = useState(null)

	useEffect(() => {
		if (session && id) {
			fetchStatistics()
		}
	}, [session, id])

	const fetchStatistics = async () => {
		try {
			const response = await fetch(`/api/shared-budgets/${id}/statistics`)
			const data = await response.json()

			if (data.success) {
				setStatistics(data.data)
			} else {
				throw new Error(data.message)
			}
		} catch (error) {
			setError('Nie udało się pobrać statystyk')
			console.error('Błąd podczas pobierania statystyk:', error)
		} finally {
			setIsLoading(false)
		}
	}

	const prepareChartData = () => {
		if (!statistics || !statistics.userExpenses) return null

		return {
			labels: statistics.userExpenses.map(item => item.userName),
			datasets: [
				{
					data: statistics.userExpenses.map(item => item.amount),
					backgroundColor: chartColors.slice(0, statistics.userExpenses.length),
					borderWidth: 0,
				},
			],
		}
	}

	const chartOptions = {
		responsive: true,
		maintainAspectRatio: false,
		plugins: {
			legend: {
				position: 'bottom',
				labels: {
					padding: 20,
					font: {
						size: 12,
					},
				},
			},
		},
	}

	if (status === 'loading' || isLoading) {
		return (
			<div className={styles.loadingContainer}>
				<div className={styles.loadingSpinner}></div>
				<p className={styles.loadingText}>Ładowanie statystyk...</p>
			</div>
		)
	}

	if (!session) {
		router.push('/auth/signin')
		return null
	}

	return (
		<div className={styles.container}>
			<Card className={styles.card}>
				<h1 className={styles.title}>Statystyki wydatków</h1>

				{error && (
					<div className={styles.errorContainer}>
						<p className={styles.errorText}>{error}</p>
					</div>
				)}

				{statistics && (
					<>
						<div className={styles.chartContainer}>
							<div className={styles.chart}>
								<Pie data={prepareChartData()} options={chartOptions} />
							</div>
						</div>

						<div className={styles.summaryContainer}>
							<h2 className={styles.summaryTitle}>Podsumowanie</h2>
							<p className={styles.totalAmount}>Łączna kwota wydatków: {statistics.totalAmount.toFixed(2)} zł</p>

							<div className={styles.userSummaries}>
								{statistics.userExpenses.map(user => (
									<div key={user.userId} className={styles.userSummary}>
										<div className={styles.userInfo}>
											<p className={styles.userName}>{user.userName}</p>
											<p className={styles.userEmail}>{user.userEmail}</p>
										</div>
										<div className={styles.userAmount}>
											<p className={styles.amount}>{user.amount.toFixed(2)} zł</p>
											<p className={styles.percentage}>
												({((user.amount / statistics.totalAmount) * 100).toFixed(1)}%)
											</p>
										</div>
									</div>
								))}
							</div>
						</div>
					</>
				)}
			</Card>
		</div>
	)
}
