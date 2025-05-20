import React from 'react'
import { useRouter } from 'next/router'
import styles from './index.module.css'

export default function Home() {
	const router = useRouter()

	return (
		<div className={styles.container}>
			<header className={styles.header}>
				<h1 className={styles.title}>Receipt Scanner</h1>
				<p className={styles.subtitle}>Zarządzaj swoimi wydatkami</p>
			</header>

			<div className={styles.buttonContainer}>
				<button className={styles.button} onClick={() => router.push('/scan')}>
					Skanuj paragon
				</button>

				<button className={styles.button} onClick={() => router.push('/expenses')}>
					Moje wydatki
				</button>

				<button className={styles.button} onClick={() => router.push('/dashboard')}>
					Dashboard
				</button>

				<button className={styles.button} onClick={() => router.push('/categories')}>
					Kategorie
				</button>
			</div>

			<footer className={styles.footer}>
				<p className={styles.footerText}>Wersja 1.0.0</p>
			</footer>
		</div>
	)
}
