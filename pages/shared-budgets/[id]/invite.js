import React, { useState } from 'react'
import { View, Text, StyleSheet, ScrollView, TextInput } from 'react-native'
import { useRouter } from 'next/router'
import Card from '../../../components/common/Card'
import Button from '../../../components/common/Button'

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
		<ScrollView style={styles.container}>
			<Card style={styles.form}>
				<Text style={styles.title}>Zaproś osobę do budżetu</Text>

				<View style={styles.inputGroup}>
					<Text style={styles.label}>Adres email</Text>
					<TextInput
						style={styles.input}
						value={email}
						onChangeText={setEmail}
						placeholder="email@przykład.pl"
						keyboardType="email-address"
						autoCapitalize="none"
					/>
				</View>

				<View style={styles.inputGroup}>
					<Text style={styles.label}>Udział w budżecie (%)</Text>
					<TextInput
						style={styles.input}
						value={contributionRatio}
						onChangeText={setContributionRatio}
						placeholder="50"
						keyboardType="numeric"
					/>
					<Text style={styles.hint}>Określ procentowy udział zaproszonej osoby w budżecie</Text>
				</View>

				{error ? <Text style={styles.errorText}>{error}</Text> : null}

				<Button title={loading ? 'Wysyłanie...' : 'Wyślij zaproszenie'} onPress={handleInvite} disabled={loading} />
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
	hint: {
		fontSize: 12,
		color: '#666',
		marginTop: 4,
	},
	errorText: {
		color: 'red',
		marginBottom: 10,
	},
})
