import React, { useState, useEffect } from 'react'
import { View, Text, StyleSheet, ScrollView } from 'react-native'
import { useRouter } from 'next/router'
import Card from '../../components/common/Card'
import Button from '../../components/common/Button'

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

	if (loading) return <Text style={styles.loadingText}>Ładowanie...</Text>
	if (error) return <Text style={styles.errorText}>{error}</Text>
	if (!budget) return <Text style={styles.errorText}>Nie znaleziono budżetu</Text>

	return (
		<ScrollView style={styles.container}>
			<Card style={styles.header}>
				<Text style={styles.title}>{budget.name}</Text>
				<Text style={styles.description}>{budget.description}</Text>
				<Text style={styles.budget}>Budżet miesięczny: {budget.monthlyBudget.toFixed(2)} zł</Text>
			</Card>

			<Card style={styles.section}>
				<Text style={styles.sectionTitle}>Członkowie ({budget.members.length})</Text>
				{budget.members.map((member, index) => (
					<View key={index} style={styles.memberItem}>
						<Text style={styles.memberName}>{member.userId.name || 'Użytkownik'}</Text>
						<Text style={styles.memberRole}>
							{member.role === 'owner' ? 'Właściciel' : member.role === 'editor' ? 'Edytor' : 'Przeglądający'}
						</Text>
						<Text style={styles.memberShare}>Udział: {member.contributionRatio}%</Text>
					</View>
				))}
				<Button
					title="Zaproś osobę"
					onPress={() => router.push(`/shared-budgets/${id}/invite`)}
					style={styles.inviteButton}
				/>
			</Card>
		</ScrollView>
	)
}

const styles = StyleSheet.create({
	container: {
		flex: 1,
		backgroundColor: '#f8f9fa',
	},
	header: {
		margin: 16,
		padding: 16,
	},
	title: {
		fontSize: 24,
		fontWeight: 'bold',
		marginBottom: 8,
	},
	description: {
		fontSize: 16,
		color: '#666',
		marginBottom: 8,
	},
	budget: {
		fontSize: 18,
		fontWeight: '500',
		color: '#2E7D32',
	},
	section: {
		margin: 16,
		padding: 16,
	},
	sectionTitle: {
		fontSize: 18,
		fontWeight: 'bold',
		marginBottom: 16,
	},
	memberItem: {
		padding: 12,
		borderBottomWidth: 1,
		borderBottomColor: '#eee',
	},
	memberName: {
		fontSize: 16,
		fontWeight: '500',
	},
	memberRole: {
		fontSize: 14,
		color: '#666',
	},
	memberShare: {
		fontSize: 14,
		color: '#2E7D32',
	},
	inviteButton: {
		marginTop: 16,
	},
	loadingText: {
		textAlign: 'center',
		padding: 20,
		fontSize: 16,
	},
	errorText: {
		textAlign: 'center',
		padding: 20,
		fontSize: 16,
		color: 'red',
	},
})
