import { useRouter } from 'next/router'
import { useSession } from 'next-auth/react'
import { useState, useEffect } from 'react'
import Card from '../../../components/common/Card'
import Button from '../../../components/common/Button'
import Input from '../../../components/common/Input'

export default function EditSharedBudget() {
	const router = useRouter()
	const { id } = router.query
	const { data: session } = useSession()
	const [budget, setBudget] = useState(null)
	const [isLoading, setIsLoading] = useState(true)
	const [isSaving, setIsSaving] = useState(false)
	const [error, setError] = useState(null)
	const [formData, setFormData] = useState({
		name: '',
		monthlyLimit: '',
		members: [],
	})

	useEffect(() => {
		if (id) {
			fetchBudgetDetails()
		}
	}, [id])

	const fetchBudgetDetails = async () => {
		try {
			const response = await fetch(`/api/shared-budgets/${id}`)
			const data = await response.json()

			if (response.ok) {
				setBudget(data.data)
				setFormData({
					name: data.data.name,
					monthlyLimit: data.data.monthlyBudget?.toString() || '',
					members: data.data.members || [],
				})
			} else {
				setError(data.message)
			}
		} catch (error) {
			setError('Wystąpił błąd podczas ładowania danych')
		} finally {
			setIsLoading(false)
		}
	}

	const handleSubmit = async e => {
		e.preventDefault()
		setIsSaving(true)
		setError(null)

		try {
			if (!formData.name || !formData.monthlyLimit) {
				setError('Wypełnij wszystkie wymagane pola')
				return
			}

			const submitData = {
				name: formData.name,
				monthlyLimit: parseFloat(formData.monthlyLimit),
				members: formData.members,
			}

			console.log('Wysyłane dane:', submitData)

			const response = await fetch(`/api/shared-budgets/${id}`, {
				method: 'PATCH',
				headers: {
					'Content-Type': 'application/json',
				},
				body: JSON.stringify(submitData),
			})

			const data = await response.json()
			console.log('Odpowiedź serwera:', data)

			if (response.ok) {
				alert('Zmiany zostały zapisane!')
				router.push('/budgets')
			} else {
				throw new Error(data.message || 'Wystąpił błąd podczas zapisywania zmian')
			}
		} catch (error) {
			console.error('Błąd podczas zapisywania:', error)
			setError(error.message || 'Wystąpił błąd podczas zapisywania zmian')
		} finally {
			setIsSaving(false)
		}
	}

	const handleChange = (field, value) => {
		console.log('Zmiana pola:', field, 'na wartość:', value)
		setFormData(prev => ({
			...prev,
			[field]: value,
		}))
	}

	if (isLoading) return <div>Ładowanie...</div>
	if (error)
		return (
			<div className="error-container">
				<p className="error-message">Błąd: {error}</p>
				<Button title="Wróć" onPress={() => router.push('/budgets')} variant="outline" />
			</div>
		)
	if (!budget) return <div>Nie znaleziono budżetu</div>

	return (
		<div className="container">
			<Card>
				<h1>Edytuj budżet wspólny</h1>
				{error && <div className="error-message">{error}</div>}
				<form onSubmit={handleSubmit}>
					<div className="form-group">
						<label>Nazwa budżetu *</label>
						<input
							type="text"
							value={formData.name}
							onChange={e => handleChange('name', e.target.value)}
							placeholder="Nazwa budżetu"
							required
							className="form-input"
						/>
					</div>

					<div className="form-group">
						<label>Limit miesięczny *</label>
						<input
							type="number"
							value={formData.monthlyLimit}
							onChange={e => handleChange('monthlyLimit', e.target.value)}
							placeholder="0.00"
							step="0.01"
							required
							className="form-input"
						/>
					</div>

					<div className="members-section">
						<h2>Członkowie budżetu</h2>
						{formData.members.map(member => (
							<div key={member.userId} className="member-item">
								<p>{member.email}</p>
								<p>Rola: {member.role}</p>
							</div>
						))}
					</div>

					<div className="button-group">
						<button type="button" onClick={() => router.push('/budgets')} className="button outline">
							Anuluj
						</button>
						<button type="submit" disabled={isSaving} className="button primary">
							{isSaving ? 'Zapisywanie...' : 'Zapisz zmiany'}
						</button>
					</div>
				</form>
			</Card>

			<style jsx>{`
				.container {
					padding: 20px;
					max-width: 800px;
					margin: 0 auto;
				}
				.form-group {
					margin-bottom: 20px;
				}
				.form-input {
					width: 100%;
					padding: 8px;
					border: 1px solid #ddd;
					border-radius: 4px;
					margin-top: 5px;
				}
				.error-message {
					color: red;
					margin-bottom: 15px;
					padding: 10px;
					background-color: #fff3f3;
					border-radius: 4px;
				}
				.button-group {
					display: flex;
					gap: 10px;
					margin-top: 20px;
				}
				.button {
					padding: 10px 20px;
					border-radius: 4px;
					cursor: pointer;
					border: none;
				}
				.button.outline {
					background: none;
					border: 1px solid #ccc;
				}
				.button.primary {
					background: #0070f3;
					color: white;
				}
				.button:disabled {
					opacity: 0.5;
					cursor: not-allowed;
				}
				.members-section {
					margin-top: 20px;
				}
				.member-item {
					padding: 10px;
					border: 1px solid #eee;
					margin-bottom: 10px;
					border-radius: 4px;
				}
			`}</style>
		</div>
	)
}
