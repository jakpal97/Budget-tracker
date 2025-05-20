import React, { useState, useEffect } from 'react'
import { View, Text, StyleSheet } from 'react-native'
import { useRouter } from 'next/router'
import Card from '../../../components/common/Card'
import Button from '../../../components/common/Button'

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
                method: 'POST'
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

    if (loading) return <Text style={styles.loadingText}>Ładowanie...</Text>
    if (error) return <Text style={styles.errorText}>{error}</Text>

    return (
        <View style={styles.container}>
            <Card style={styles.card}>
                <Text style={styles.title}>Zaproszenie do wspólnego budżetu</Text>
                <Text style={styles.budgetName}>{budgetDetails?.name}</Text>
                <Text style={styles.description}>
                    Zostałeś zaproszony do wspólnego budżetu z udziałem {budgetDetails?.contributionRatio}%
                </Text>
                <Button 
                    title="Akceptuj zaproszenie" 
                    onPress={handleAccept}
                    style={styles.acceptButton}
                />
                <Button 
                    title="Odrzuć" 
                    onPress={() => router.push('/shared-budgets')}
                    type="outline"
                />
            </Card>
        </View>
    )
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#f8f9fa',
        padding: 16,
    },
    card: {
        padding: 16,
    },
    title: {
        fontSize: 24,
        fontWeight: 'bold',
        marginBottom: 16,
        textAlign: 'center',
    },
    budgetName: {
        fontSize: 20,
        fontWeight: '500',
        marginBottom: 8,
        textAlign: 'center',
    },
    description: {
        fontSize: 16,
        marginBottom: 24,
        textAlign: 'center',
        color: '#666',
    },
    acceptButton: {
        marginBottom: 8,
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