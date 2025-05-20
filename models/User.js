import mongoose from 'mongoose'

// Definicja schematu użytkownika
const UserSchema = new mongoose.Schema({
	name: {
		type: String,
		required: true,
	},
	email: {
		type: String,
		required: true,
		unique: true, // Zapewnia unikalność adresów email
	},
	password: {
		type: String,
		// Hasło może być null dla uwierzytelniania przez dostawcę OAuth
	},
	image: {
		type: String,
	},
	emailVerified: {
		type: Date,
	},
	createdAt: {
		type: Date,
		default: Date.now, // Automatycznie ustawia datę utworzenia
	},
	updatedAt: {
		type: Date,
		default: Date.now,
	},
	preferences: {
		defaultCurrency: {
			type: String,
			default: 'PLN', // Domyślna waluta dla polskich użytkowników
		},
		theme: {
			type: String,
			default: 'light',
		},
		language: {
			type: String,
			default: 'pl',
		},
	},
})

// Dodaj pre-save hook do aktualizacji daty updatedAt
UserSchema.pre('save', function (next) {
	this.updatedAt = Date.now()
	next()
})

// Eksportuj model jeśli już istnieje, w przeciwnym razie utwórz go
export default mongoose.models.User || mongoose.model('User', UserSchema)
