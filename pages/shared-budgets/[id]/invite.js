import React, { useState } from 'react'
import { useRouter } from 'next/router'
import Card from '../../../components/common/Card'
import Button from '../../../components/common/Button'
import styles from './Invite.module.css'

export default function InviteUser() {
	const router = useRouter()
	const { id } = router.query
	const [email, setEmail] = useState('')
	const [contributionRatio, setContributionRatio] = useState('50')
	const [loading, setLoading] = useState(false)
	const [error, setError] = useState('')

	const handleInvite = async () => {
		if (!email.includes('@')) {
			setError('Wprowadź prawidłowy adres email')
			return
		}

		try {
			setLoading(true)
			setError('')

			const response = await fetch(`/api/shared-budgets/${id}/invite`, {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
				},
				body: JSON.stringify({
					email,
					contributionRatio: parseInt(contributionRatio),
				}),
			})

			const data = await response.json()

			if (data.success) {
				router.push(`/shared-budgets/${id}`)
			} else {
				setError(data.message || 'Wystąpił błąd podczas wysyłania zaproszenia')
			}
		} catch (error) {
			setError('Nie udało się wysłać zaproszenia')
		} finally {
			setLoading(false)
		}
	}

	return (
		<div className={styles.container}>
			<Card className={styles.form}>
				<h1 className={styles.title}>Zaproś osobę do budżetu</h1>

				<div className={styles.inputGroup}>
					<label className={styles.label} htmlFor="email">
						Adres email
					</label>
					<input
						id="email"
						className={styles.input}
						value={email}
						onChange={e => setEmail(e.target.value)}
						placeholder="email@przykład.pl"
						type="email"
						autoCapitalize="off"
					/>
				</div>

				<div className={styles.inputGroup}>
					<label className={styles.label} htmlFor="contribution">
						Udział w budżecie (%)
					</label>
					<input
						id="contribution"
						className={styles.input}
						value={contributionRatio}
						onChange={e => setContributionRatio(e.target.value)}
						placeholder="50"
						type="number"
						min="0"
						max="100"
					/>
					<p className={styles.hint}>Określ procentowy udział zaproszonej osoby w budżecie</p>
				</div>

				{error && <p className={styles.errorText}>{error}</p>}

				<Button onClick={handleInvite} disabled={loading}>
					{loading ? 'Wysyłanie...' : 'Wyślij zaproszenie'}
				</Button>
			</Card>
		</div>
	)
}
