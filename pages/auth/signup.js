import React, { useState } from 'react'
import { useRouter } from 'next/router'
import { signIn } from 'next-auth/react'
import Button from '../../components/common/Button'
import Input from '../../components/common/Input'
import styles from './SignUp.module.css'

export default function SignUp() {
	const [name, setName] = useState('')
	const [email, setEmail] = useState('')
	const [password, setPassword] = useState('')
	const [confirmPassword, setConfirmPassword] = useState('')
	const [error, setError] = useState('')
	const [success, setSuccess] = useState('')
	const [isLoading, setIsLoading] = useState(false)
	const router = useRouter()

	const handleSignUp = async e => {
		e.preventDefault()
		setError('')
		setSuccess('')

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
				setSuccess('Konto zostało utworzone pomyślnie. Możesz się teraz zalogować.')

				// Automatyczne logowanie po rejestracji
				const result = await signIn('credentials', {
					redirect: false,
					email,
					password,
				})

				if (result.ok) {
					router.push('/')
				} else {
					setError('Nie udało się automatycznie zalogować. Spróbuj zalogować się ręcznie.')
				}
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

				{success && (
					<div className={styles.successContainer}>
						<p className={styles.successText}>{success}</p>
					</div>
				)}

				<form onSubmit={handleSignUp}>
					<div className={styles.inputContainer}>
						<Input
							label="Imię i nazwisko"
							value={name}
							onChange={e => setName(e.target.value)}
							placeholder="Twoje imię i nazwisko"
							required
						/>
					</div>

					<div className={styles.inputContainer}>
						<Input
							label="Email"
							value={email}
							onChange={e => setEmail(e.target.value)}
							placeholder="Twój adres email"
							type="email"
							required
						/>
					</div>

					<div className={styles.inputContainer}>
						<Input
							label="Hasło"
							value={password}
							onChange={e => setPassword(e.target.value)}
							placeholder="Utwórz hasło"
							type="password"
							required
						/>
					</div>

					<div className={styles.inputContainer}>
						<Input
							label="Potwierdź hasło"
							value={confirmPassword}
							onChange={e => setConfirmPassword(e.target.value)}
							placeholder="Powtórz hasło"
							type="password"
							required
						/>
					</div>

					<Button type="submit" disabled={isLoading} className={styles.signUpButton}>
						{isLoading ? 'Rejestracja...' : 'Zarejestruj się'}
					</Button>
				</form>

				<div className={styles.signinContainer}>
					<p className={styles.signinText}>
						Masz już konto?{' '}
						<button onClick={() => router.push('/auth/signin')} className={styles.signinLink}>
							Zaloguj się
						</button>
					</p>
				</div>
			</div>
		</div>
	)
}
