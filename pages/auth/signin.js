import React, { useState } from 'react'
import { signIn, signOut, useSession } from 'next-auth/react'
import { useRouter } from 'next/router'
import styles from './signin.module.css'

export default function SignIn() {
	const [email, setEmail] = useState('')
	const [password, setPassword] = useState('')
	const [error, setError] = useState('')
	const [isLoading, setIsLoading] = useState(false)
	const router = useRouter()
	const { data: session } = useSession()

	// Jeśli użytkownik jest już zalogowany, przekieruj go na stronę główną
	if (session) {
		router.push('/')
		return null
	}

	const handleEmailSignIn = async () => {
		setIsLoading(true)
		setError('')

		try {
			const result = await signIn('credentials', {
				redirect: false,
				email,
				password,
			})

			if (result.error) {
				setError(result.error)
			} else {
				// Przekieruj na stronę główną po pomyślnym logowaniu
				router.push('/')
			}
		} catch (err) {
			setError('Wystąpił błąd podczas logowania')
			console.error(err)
		} finally {
			setIsLoading(false)
		}
	}

	const handleGoogleSignIn = () => {
		signIn('google', { callbackUrl: '/' })
	}

	return (
		<div className={styles.container}>
			<div className={styles.formContainer}>
				<h1 className={styles.title}>Logowanie</h1>

				{error && (
					<div className={styles.errorContainer}>
						<p className={styles.errorText}>{error}</p>
					</div>
				)}

				<div className={styles.inputContainer}>
					<label className={styles.label}>Email</label>
					<input
						className={styles.input}
						value={email}
						onChange={e => setEmail(e.target.value)}
						placeholder="Twój adres email"
						type="email"
						autoCapitalize="off"
					/>
				</div>

				<div className={styles.inputContainer}>
					<label className={styles.label}>Hasło</label>
					<input
						className={styles.input}
						value={password}
						onChange={e => setPassword(e.target.value)}
						placeholder="Twoje hasło"
						type="password"
					/>
				</div>

				<button className={styles.signInButton} onClick={handleEmailSignIn} disabled={isLoading}>
					{isLoading ? 'Logowanie...' : 'Zaloguj się'}
				</button>

				<div className={styles.divider}>
					<div className={styles.dividerLine} />
					<span className={styles.dividerText}>lub</span>
					<div className={styles.dividerLine} />
				</div>

				<button className={styles.googleButton} onClick={handleGoogleSignIn}>
					Zaloguj się przez Google
				</button>

				<div className={styles.signupContainer}>
					<span className={styles.signupText}>Nie masz jeszcze konta?</span>
					<button className={styles.signupLink} onClick={() => router.push('/auth/signup')}>
						Zarejestruj się
					</button>
				</div>
			</div>
		</div>
	)
}
