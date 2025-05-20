import React, { useState } from 'react'
import { View, Text, StyleSheet, ScrollView, TextInput } from 'react-native'
import { useRouter } from 'next/router'
import Card from '../../components/common/Card'
import Button from '../../components/common/Button'

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
		<ScrollView style={styles.container}>
			<Card style={styles.form}>
				<Text style={styles.title}>Utwórz nowy wspólny budżet</Text>

				<View style={styles.inputGroup}>
					<Text style={styles.label}>Nazwa budżetu*</Text>
					<TextInput style={styles.input} value={name} onChangeText={setName} placeholder="np. Budżet domowy" />
				</View>

				<View style={styles.inputGroup}>
					<Text style={styles.label}>Opis (opcjonalny)</Text>
					<TextInput
						style={[styles.input, styles.textArea]}
						value={description}
						onChangeText={setDescription}
						placeholder="Opisz cel tego budżetu"
						multiline
						numberOfLines={4}
					/>
				</View>

				<View style={styles.inputGroup}>
					<Text style={styles.label}>Miesięczny budżet (zł)</Text>
					<TextInput
						style={styles.input}
						value={monthlyBudget}
						onChangeText={setMonthlyBudget}
						placeholder="0.00"
						keyboardType="numeric"
					/>
				</View>

				{error ? <Text style={styles.errorText}>{error}</Text> : null}

				<Button title={loading ? 'Tworzenie...' : 'Utwórz budżet'} onPress={handleCreate} disabled={loading} />
			</Card>
		</ScrollView>
	)
}

const styles = StyleSheet.create({
	container: {
		flex: 1,
		backgroundColor: '#f8f9fa',
	},
	form: {
		margin: 16,
		padding: 16,
	},
	title: {
		fontSize: 24,
		fontWeight: 'bold',
		marginBottom: 20,
		textAlign: 'center',
	},
	inputGroup: {
		marginBottom: 16,
	},
	label: {
		fontSize: 16,
		marginBottom: 8,
		fontWeight: '500',
	},
	input: {
		backgroundColor: 'white',
		borderWidth: 1,
		borderColor: '#ddd',
		borderRadius: 8,
		padding: 12,
		fontSize: 16,
	},
	textArea: {
		minHeight: 100,
		textAlignVertical: 'top',
	},
	errorText: {
		color: 'red',
		marginBottom: 10,
	},
})
