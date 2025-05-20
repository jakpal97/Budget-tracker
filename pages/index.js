import React from 'react'
import { useRouter } from 'next/router'
import { useSession } from 'next-auth/react'
import styles from './index.module.css'

export default function Home() {
	const router = useRouter()
	const { data: session } = useSession()

	// Przekieruj zalogowanych użytkowników na dashboard
	React.useEffect(() => {
		if (session) {
			router.push('/dashboard')
		}
	}, [session, router])

	// Jeśli użytkownik jest zalogowany, nie renderuj nic podczas przekierowania
	if (session) {
		return null
	}

	return (
		<div className={styles.container}>
			<header className={styles.header}>
				<h1 className={styles.title}>Receipt Scanner</h1>
				<p className={styles.subtitle}>Zarządzaj swoimi wydatkami</p>
			</header>

			<div className={styles.buttonContainer}>
				<button className={styles.button} onClick={() => router.push('/auth/signin')}>
					Zaloguj się
				</button>

				<button className={styles.button} onClick={() => router.push('/auth/signup')}>
					Zarejestruj się
				</button>
			</div>

			<footer className={styles.footer}>
				<p className={styles.footerText}>Wersja 1.0.0</p>
			</footer>
		</div>
	)
}
