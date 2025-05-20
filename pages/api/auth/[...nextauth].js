import NextAuth from 'next-auth'
import CredentialsProvider from 'next-auth/providers/credentials'
import GoogleProvider from 'next-auth/providers/google'
import bcrypt from 'bcryptjs'
import { connectToDatabase } from '../../../lib/db'
import User from '../../../models/User'
import { Category } from '../../../models/Category'

// Eksportujemy konfigurację, aby można było jej użyć w innych miejscach
export const authOptions = {
	// Konfiguracja dostawców uwierzytelniania
	providers: [
		// Logowanie przez email/hasło
		CredentialsProvider({
			name: 'Credentials',
			credentials: {
				email: { label: 'Email', type: 'email' },
				password: { label: 'Hasło', type: 'password' },
			},
			async authorize(credentials) {
				// Połączenie z bazą danych
				await connectToDatabase()

				// Znajdź użytkownika po emailu
				const user = await User.findOne({ email: credentials.email })

				if (!user) {
					throw new Error('Nie znaleziono użytkownika o podanym adresie email')
				}

				// Sprawdź hasło
				const isValid = await bcrypt.compare(credentials.password, user.password)

				if (!isValid) {
					throw new Error('Nieprawidłowe hasło')
				}

				// Zwróć dane użytkownika do zalogowania
				return {
					id: user._id.toString(),
					name: user.name,
					email: user.email,
					image: user.image,
				}
			},
		}),

		// Logowanie przez Google (opcjonalnie)
		GoogleProvider({
			clientId: process.env.GOOGLE_ID,
			clientSecret: process.env.GOOGLE_SECRET,
			authorization: {
				params: {
					prompt: 'consent',
					access_type: 'offline',
					response_type: 'code',
				},
			},
		}),
	],

	// Niestandardowe strony uwierzytelniania
	pages: {
		signIn: '/auth/signin',
		signOut: '/auth/signout',
		error: '/auth/error',
		newUser: '/auth/new-user',
	},

	// Konfiguracja sesji
	session: {
		strategy: 'jwt', // Używamy JWT (JSON Web Token) do zarządzania sesją
		maxAge: 30 * 24 * 60 * 60, // 30 dni ważności sesji
	},

	// Funkcje callbacks do dostosowania procesu uwierzytelniania
	callbacks: {
		// Dostosowuje token JWT
		async jwt({ token, user, account }) {
			// Dodaj ID użytkownika do tokenu JWT
			if (user) {
				token.userId = user.id
			}
			return token
		},

		// Dostosowuje obiekt sesji dostępny po stronie klienta
		async session({ session, token }) {
			// Dodaj ID użytkownika do sesji
			if (token) {
				session.user.id = token.userId
			}
			return session
		},

		// Wykonuje akcje po pomyślnym logowaniu
		async signIn({ user, account, profile }) {
			try {
				// Obsługa logowania przez Google
				if (account && account.provider === 'google') {
					await connectToDatabase()

					const existingUser = await User.findOne({ email: profile.email })

					if (!existingUser) {
						// Utwórz nowego użytkownika
						const newUser = new User({
							name: profile.name,
							email: profile.email,
							image: profile.picture,
							emailVerified: new Date(),
						})

						await newUser.save()

						// Utwórz domyślne kategorie dla nowego użytkownika
						await Category.createDefaultCategories(newUser._id)
					} else {
						// Aktualizuj dane użytkownika, jeśli się zmieniły
						if (existingUser.name !== profile.name || existingUser.image !== profile.picture) {
							existingUser.name = profile.name
							existingUser.image = profile.picture
							await existingUser.save()
						}
					}
				}

				return true // Zezwól na logowanie
			} catch (error) {
				console.error('Błąd podczas logowania:', error)
				return false
			}
		},
	},

	// Ustawienia bezpieczeństwa
	secret: process.env.NEXTAUTH_SECRET,
	debug: process.env.NODE_ENV === 'development',
}

// Konfiguracja limitu rozmiaru ciała żądania
export const config = {
	api: {
		bodyParser: {
			sizeLimit: '10mb',
		},
	},
}

export default NextAuth(authOptions)
