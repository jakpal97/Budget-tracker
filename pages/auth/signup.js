import React, { useState } from 'react'
import { useRouter } from 'next/router'
import styles from './signin.module.css'

export default function SignUp() {
	const [name, setName] = useState('')
	const [email, setEmail] = useState('')
	const [password, setPassword] = useState('')
	const [confirmPassword, setConfirmPassword] = useState('')
	const [error, setError] = useState('')
	const [isLoading, setIsLoading] = useState(false)
	const router = useRouter()

	const handleSignUp = async e => {
		e.preventDefault()
		setError('')

		if (!name || !email || !password || !confirmPassword) {
			setError('Wszystkie pola są wymagane')
			return
		}

		if (password !== confirmPassword) {
			setError('Hasła nie są identyczne')
			return
		}

		setIsLoading(true)

		try {
			const response = await fetch('/api/auth/signup', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
				},
				body: JSON.stringify({
					name,
					email,
					password,
				}),
			})

			const data = await response.json()

			if (data.success) {
				// Przekieruj do strony logowania po udanej rejestracji
				router.push('/auth/signin')
			} else {
				setError(data.message || 'Wystąpił błąd podczas rejestracji')
			}
		} catch (error) {
			setError('Wystąpił błąd podczas rejestracji')
			console.error('Błąd rejestracji:', error)
		} finally {
			setIsLoading(false)
		}
	}

	return (
		<div className={styles.container}>
			<div className={styles.formContainer}>
				<h1 className={styles.title}>Rejestracja</h1>

				{error && (
					<div className={styles.errorContainer}>
						<p className={styles.errorText}>{error}</p>
					</div>
				)}

				<form onSubmit={handleSignUp}>
					<div className={styles.inputContainer}>
						<label className={styles.label}>Imię i nazwisko</label>
						<input
							className={styles.input}
							value={name}
							onChange={e => setName(e.target.value)}
							placeholder="Twoje imię i nazwisko"
							type="text"
							required
						/>
					</div>

					<div className={styles.inputContainer}>
						<label className={styles.label}>Email</label>
						<input
							className={styles.input}
							value={email}
							onChange={e => setEmail(e.target.value)}
							placeholder="Twój adres email"
							type="email"
							required
							autoCapitalize="off"
						/>
					</div>

					<div className={styles.inputContainer}>
						<label className={styles.label}>Hasło</label>
						<input
							className={styles.input}
							value={password}
							onChange={e => setPassword(e.target.value)}
							placeholder="Utwórz hasło"
							type="password"
							required
						/>
					</div>

					<div className={styles.inputContainer}>
						<label className={styles.label}>Potwierdź hasło</label>
						<input
							className={styles.input}
							value={confirmPassword}
							onChange={e => setConfirmPassword(e.target.value)}
							placeholder="Powtórz hasło"
							type="password"
							required
						/>
					</div>

					<button type="submit" className={styles.signInButton} disabled={isLoading}>
						{isLoading ? 'Rejestracja...' : 'Zarejestruj się'}
					</button>
				</form>

				<div className={styles.signupContainer}>
					<span className={styles.signupText}>Masz już konto?</span>
					<button className={styles.signupLink} onClick={() => router.push('/auth/signin')}>
						Zaloguj się
					</button>
				</div>
			</div>
		</div>
	)
}
