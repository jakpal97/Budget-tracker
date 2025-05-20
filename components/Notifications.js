import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/router'
import Card from './common/Card'
import { Bell } from 'react-feather'
import styles from './Notifications.module.css'

export default function Notifications() {
	const router = useRouter()
	const [isOpen, setIsOpen] = useState(false)
	const [notifications, setNotifications] = useState([])
	const [loading, setLoading] = useState(true)

	useEffect(() => {
		fetchNotifications()
	}, [])

	const fetchNotifications = async () => {
		try {
			const response = await fetch('/api/notifications')
			const data = await response.json()
			if (data.success) {
				setNotifications(data.data)
			}
		} catch (error) {
			console.error('Błąd podczas pobierania powiadomień:', error)
		} finally {
			setLoading(false)
		}
	}

	const markAsRead = async notificationId => {
		try {
			const response = await fetch(`/api/notifications/${notificationId}/read`, {
				method: 'PUT',
			})
			const data = await response.json()
			if (data.success) {
				fetchNotifications()
			}
		} catch (error) {
			console.error('Błąd podczas oznaczania powiadomienia jako przeczytane:', error)
		}
	}

	return (
		<div className={styles.container}>
			<button className={styles.bellContainer} onClick={() => setIsOpen(!isOpen)}>
				<Bell stroke="#000" width={24} height={24} />
				{notifications.length > 0 && (
					<div className={styles.badge}>
						<span className={styles.badgeText}>{notifications.length}</span>
					</div>
				)}
			</button>

			{isOpen && (
				<Card className={styles.notificationsContainer}>
					<h3 className={styles.title}>Powiadomienia</h3>
					{loading ? (
						<p className={styles.loadingText}>Ładowanie...</p>
					) : notifications.length > 0 ? (
						<div className={styles.notificationsList}>
							{notifications.map(notification => (
								<button
									key={notification._id}
									className={styles.notificationItem}
									onClick={() => {
										markAsRead(notification._id)
										if (notification.budgetId) {
											router.push(`/shared-budgets/${notification.budgetId._id}`)
										}
										setIsOpen(false)
									}}>
									<h4 className={styles.notificationTitle}>{notification.title}</h4>
									<p className={styles.notificationMessage}>{notification.message}</p>
									<p className={styles.notificationDate}>{new Date(notification.createdAt).toLocaleDateString()}</p>
								</button>
							))}
						</div>
					) : (
						<p className={styles.emptyText}>Brak nowych powiadomień</p>
					)}
				</Card>
			)}
		</div>
	)
}
