import mongoose from 'mongoose'

// Zmienne do śledzenia stanu połączenia
const MONGODB_URI = process.env.MONGODB_URI
let cached = global.mongoose

if (!cached) {
	cached = global.mongoose = { conn: null, promise: null }
}

// Funkcja do połączenia z bazą danych
async function connectToDatabase() {
	if (cached.conn) {
		return cached.conn
	}

	if (!cached.promise) {
		const opts = {
			bufferCommands: false,
		}

		// Dodaj lepsze logowanie
		console.log('Connecting to MongoDB...')

		cached.promise = mongoose
			.connect(MONGODB_URI, opts)
			.then(mongoose => {
				console.log('Connected to MongoDB successfully')
				return mongoose
			})
			.catch(error => {
				console.error('Failed to connect to MongoDB:', error.message)
				throw error
			})
	}

	try {
		cached.conn = await cached.promise
		return cached.conn
	} catch (e) {
		cached.promise = null
		throw e
	}
}

// Funkcja do rozłączenia z bazą danych (przydatne w testach)
async function disconnectFromDatabase() {
	if (cached.conn) {
		await mongoose.disconnect()
		cached.conn = null
		cached.promise = null
		console.log('Disconnected from MongoDB')
	}
}

export { connectToDatabase, disconnectFromDatabase }
