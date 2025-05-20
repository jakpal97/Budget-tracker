import mongoose from 'mongoose'

// Schemat elementu paragonu
const ReceiptItemSchema = new mongoose.Schema({
	name: {
		type: String,
		required: true,
		trim: true,
	},
	price: {
		type: Number,
		required: true,
	},
	quantity: {
		type: Number,
		default: 1,
	},
	categoryId: {
		type: mongoose.Schema.Types.ObjectId,
		ref: 'Category',
		required: false,
	},
})

// Schemat paragonu
const ReceiptSchema = new mongoose.Schema(
	{
		userId: {
			type: String,
			required: [true, 'Paragon musi być przypisany do użytkownika'],
			index: true,
		},
		store: {
			type: String,
			required: [true, 'Nazwa sklepu jest wymagana'],
			trim: true,
		},
		date: {
			type: Date,
			required: [true, 'Data paragonu jest wymagana'],
			default: Date.now,
		},
		totalAmount: {
			type: Number,
			required: [true, 'Kwota paragonu jest wymagana'],
			min: [0, 'Kwota nie może być ujemna'],
		},
		items: {
			type: [ReceiptItemSchema],
			default: [],
		},
		notes: {
			type: String,
			trim: true,
			default: '',
		},
		imageUrl: {
			type: String,
			default: null,
		},
		ocrText: {
			type: String,
			default: null,
		},
		categoryId: {
			type: mongoose.Schema.Types.ObjectId,
			ref: 'Category',
			default: null,
		},
		tags: {
			type: [String],
			default: [],
		},
		createdAt: {
			type: Date,
			default: Date.now,
		},
		updatedAt: {
			type: Date,
			default: Date.now,
		},
		sharedBudget: {
			type: mongoose.Schema.Types.ObjectId,
			ref: 'SharedBudget',
		},
		contributedBy: {
			type: mongoose.Schema.Types.ObjectId,
			ref: 'User',
		},
		splitRatio: {
			type: Map,
			of: Number,
			default: {},
		},
	},
	{
		timestamps: true, // Automatycznie dodaje createdAt i updatedAt
	}
)

// Indeksy dla wydajniejszego wyszukiwania
ReceiptSchema.index({ userId: 1, date: -1 })
ReceiptSchema.index({ store: 'text', notes: 'text' })

// Zapobiegaj przepełnieniu modelu, jeśli został już załadowany
export default mongoose.models.Receipt || mongoose.model('Receipt', ReceiptSchema)
