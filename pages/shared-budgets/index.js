import React, { useState, useEffect } from 'react'
import { View, Text, StyleSheet, ScrollView } from 'react-native'
import { useSession } from 'next-auth/react'
import Card from '../../components/common/Card'
import Button from '../../components/common/Button'

export default function SharedBudgets() {
	const { data: session } = useSession()
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
		<ScrollView style={styles.container}>
			<View style={styles.header}>
				<Text style={styles.title}>Wspólne Budżety</Text>
				<Button title="Utwórz nowy budżet" onPress={() => router.push('/shared-budgets/create')} />
			</View>

			{loading ? (
				<Text>Ładowanie...</Text>
			) : budgets.length === 0 ? (
				<Card>
					<Text>Nie masz jeszcze żadnych wspólnych budżetów</Text>
				</Card>
			) : (
				budgets.map(budget => (
					<Card key={budget._id} style={styles.budgetCard}>
						<Text style={styles.budgetName}>{budget.name}</Text>
						<Text style={styles.budgetDescription}>{budget.description}</Text>
						<Text style={styles.budgetAmount}>Budżet miesięczny: {budget.monthlyBudget.toFixed(2)} zł</Text>
					</Card>
				))
			)}
		</ScrollView>
	)
}

const styles = StyleSheet.create({
	container: {
		flex: 1,
		backgroundColor: '#f5f5f5',
	},
	header: {
		padding: 16,
		flexDirection: 'row',
		justifyContent: 'space-between',
		alignItems: 'center',
	},
	title: {
		fontSize: 24,
		fontWeight: 'bold',
	},
	budgetCard: {
		margin: 16,
		padding: 16,
	},
	budgetName: {
		fontSize: 18,
		fontWeight: 'bold',
		marginBottom: 8,
	},
	budgetDescription: {
		fontSize: 14,
		color: '#666',
		marginBottom: 8,
	},
	budgetAmount: {
		fontSize: 16,
		fontWeight: '500',
		color: '#2E7D32',
	},
})
