import NextAuth from 'next-auth'
import CredentialsProvider from 'next-auth/providers/credentials'
import GoogleProvider from 'next-auth/providers/google'
import bcrypt from 'bcryptjs'
import { connectToDatabase } from '../../../lib/db'
import User from '../../../models/User'
import { Category } from '../../../models/Category'


export const authOptions = {
	
	providers: [
		
		CredentialsProvider({
			name: 'Credentials',
			credentials: {
				email: { label: 'Email', type: 'email' },
				password: { label: 'Hasło', type: 'password' },
			},
			async authorize(credentials) {
			
				await connectToDatabase()

				
				const user = await User.findOne({ email: credentials.email })

				if (!user) {
					throw new Error('Nie znaleziono użytkownika o podanym adresie email')
				}

			
				const isValid = await bcrypt.compare(credentials.password, user.password)

				if (!isValid) {
					throw new Error('Nieprawidłowe hasło')
				}

			
				return {
					id: user._id.toString(),
					name: user.name,
					email: user.email,
					image: user.image,
				}
			},
		}),

		
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

	
	pages: {
		signIn: '/auth/signin',
		signOut: '/auth/signout',
		error: '/auth/error',
		newUser: '/auth/new-user',
	},


	session: {
		strategy: 'jwt', 
		maxAge: 1 * 24 * 60 * 60, 
	},

	
	callbacks: {
		
		async jwt({ token, user, account }) {
			
			if (user) {
				token.userId = user.id
			}
			return token
		},

		
		async session({ session, token }) {
			
			if (token) {
				session.user.id = token.userId
			}
			return session
		},

	
		async signIn({ user, account, profile }) {
			try {
			
				if (account && account.provider === 'google') {
					await connectToDatabase()

					const existingUser = await User.findOne({ email: profile.email })

					if (!existingUser) {
						
						const newUser = new User({
							name: profile.name,
							email: profile.email,
							image: profile.picture,
							emailVerified: new Date(),
						})

						await newUser.save()

						await Category.createDefaultCategories(newUser._id)
					} else {
						
						if (existingUser.name !== profile.name || existingUser.image !== profile.picture) {
							existingUser.name = profile.name
							existingUser.image = profile.picture
							await existingUser.save()
						}
					}
				}

				return true 
			} catch (error) {
				console.error('Błąd podczas logowania:', error)
				return false
			}
		},
	},

	
	secret: process.env.NEXTAUTH_SECRET,
	debug: process.env.NODE_ENV === 'development',
}


export const config = {
	api: {
		bodyParser: {
			sizeLimit: '10mb',
		},
	},
}

export default NextAuth(authOptions)
