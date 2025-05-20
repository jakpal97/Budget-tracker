import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/router'
import { useSession, signOut } from 'next-auth/react'
import styles from '../styles/Layout.module.css'

export default function Layout({ children }) {
	const router = useRouter()
	const { data: session, status } = useSession()
	const isLoading = status === 'loading'
	const isAuthenticated = !!session
	const [isMobile, setIsMobile] = useState(false)

	// Sprawdzenie, czy urządzenie jest mobilne
	useEffect(() => {
		const checkIfMobile = () => {
			if (typeof window !== 'undefined') {
				setIsMobile(window.innerWidth <= 768)
			}
		}

		checkIfMobile()
		window.addEventListener('resize', checkIfMobile)

		return () => {
			window.removeEventListener('resize', checkIfMobile)
		}
	}, [])

	// Funkcja do sprawdzenia aktywnej strony (dla podświetlania w menu)
	const isActive = path => {
		return router.pathname === path
	}

	// Lista elementów menu
	const menuItems = [
		{ name: 'Dashboard', path: '/dashboard', icon: '📊' },
		{ name: 'Skanuj', path: '/scan', icon: '📷' },
		{ name: 'Wydatki', path: '/expenses', icon: '💰' },
		{ name: 'Kategorie', path: '/categories', icon: '🏷️' },
	]

	// Jeśli sprawdzamy status sesji, pokazujemy prosty ekran ładowania
	if (isLoading) {
		return (
			<div className={styles.loadingContainer}>
				<p>Ładowanie...</p>
			</div>
		)
	}

	// Funkcja do wylogowania
	const handleSignOut = () => {
		signOut({ callbackUrl: '/auth/signin' })
	}

	// Dla stron logowania/rejestracji zwracamy tylko dzieci bez layoutu
	if (router.pathname.startsWith('/auth/')) {
		return <>{children}</>
	}

	// Jeśli użytkownik nie jest zalogowany i nie jest na stronie logowania, przekieruj go
	if (!isAuthenticated && !router.pathname.startsWith('/auth/')) {
		// W przypadku renderowania po stronie klienta, wykonaj przekierowanie
		if (typeof window !== 'undefined') {
			router.push('/auth/signin')
		}
		return null
	}

	return (
		<div className={styles.container}>
			{/* Pasek boczny (widoczny tylko na większych ekranach) */}
			{!isMobile && (
				<div className={styles.sidebar}>
					<div className={styles.logo}>
						<h1 className={styles.logoText}>Receipt Scanner</h1>
					</div>

					<div className={styles.menuContainer}>
						{menuItems.map(item => (
							<button
								key={item.path}
								className={`${styles.menuItem} ${isActive(item.path) ? styles.activeMenuItem : ''}`}
								onClick={() => router.push(item.path)}>
								<span className={styles.menuIcon}>{item.icon}</span>
								<span className={`${styles.menuText} ${isActive(item.path) ? styles.activeMenuText : ''}`}>
									{item.name}
								</span>
							</button>
						))}
					</div>

					{isAuthenticated && (
						<div className={styles.userSection}>
							<div className={styles.userInfo}>
								<p className={styles.userName}>{session.user.name}</p>
								<p className={styles.userEmail}>{session.user.email}</p>
							</div>
							<button className={styles.signOutButton} onClick={handleSignOut}>
								<span className={styles.signOutText}>Wyloguj</span>
							</button>
						</div>
					)}
				</div>
			)}

			{/* Główna zawartość */}
			<main className={`${styles.content} ${!isMobile ? styles.contentWithSidebar : ''}`}>{children}</main>

			{/* Pasek nawigacyjny (widoczny tylko na małych ekranach) */}
			{isMobile && (
				<nav className={styles.mobileNavbar}>
					{menuItems.map(item => (
						<button
							key={item.path}
							className={`${styles.mobileNavItem} ${isActive(item.path) ? styles.activeMobileNavItem : ''}`}
							onClick={() => router.push(item.path)}>
							<span className={styles.mobileNavIcon}>{item.icon}</span>
							<span className={styles.mobileNavText}>{item.name}</span>
						</button>
					))}
				</nav>
			)}
		</div>
	)
}
