import mongoose from 'mongoose'

const CategorySchema = new mongoose.Schema({
	name: {
		type: String,
		required: true, // Nazwa kategorii jest wymagana
	},
	userId: {
		type: mongoose.Schema.Types.ObjectId,
		ref: 'User', // Relacja z modelem User
		required: true, // Kategoria musi być przypisana do użytkownika
	},
	color: {
		type: String,
		default: '#3498db', // Domyślny kolor dla wizualizacji
	},
	icon: {
		type: String,
		default: 'tag', // Domyślna ikona
	},
	isDefault: {
		type: Boolean,
		default: false, // Czy jest to domyślna kategoria systemu
	},
	parentId: {
		type: mongoose.Schema.Types.ObjectId,
		ref: 'Category', // Relacja do kategorii-rodzica (dla podkategorii)
		default: null,
	},
	budget: {
		type: Number,
		default: 0, // Domyślny budżet dla kategorii
	},
	budgetPeriod: {
		type: String,
		enum: ['daily', 'weekly', 'monthly', 'yearly'], // Dozwolone wartości
		default: 'monthly',
	},
	createdAt: {
		type: Date,
		default: Date.now,
	},
	updatedAt: {
		type: Date,
		default: Date.now,
	},
})

// Aktualizacja daty ostatniej modyfikacji
CategorySchema.pre('save', function (next) {
	this.updatedAt = Date.now()
	next()
})

// Metoda statyczna do tworzenia domyślnych kategorii dla nowego użytkownika
CategorySchema.statics.createDefaultCategories = async function (userId) {
	const defaultCategories = [
		{ name: 'Żywność', color: '#e74c3c', icon: 'shopping-basket', isDefault: true },
		{ name: 'Transport', color: '#3498db', icon: 'car', isDefault: true },
		{ name: 'Mieszkanie', color: '#9b59b6', icon: 'home', isDefault: true },
		{ name: 'Rozrywka', color: '#f1c40f', icon: 'film', isDefault: true },
		{ name: 'Zdrowie', color: '#2ecc71', icon: 'heartbeat', isDefault: true },
		{ name: 'Edukacja', color: '#1abc9c', icon: 'book', isDefault: true },
		{ name: 'Inne', color: '#95a5a6', icon: 'ellipsis-h', isDefault: true },
	]

	const categories = defaultCategories.map(category => ({
		...category,
		userId,
	}))

	return this.insertMany(categories) // Dodaje wszystkie kategorie jednocześnie
}

export default mongoose.models.Category || mongoose.model('Category', CategorySchema)
