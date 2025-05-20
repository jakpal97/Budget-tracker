import mongoose from 'mongoose'

// Schemat budżetu
const BudgetSchema = new mongoose.Schema({
	userId: {
		type: mongoose.Schema.Types.ObjectId,
		ref: 'User', // Relacja z użytkownikiem
		required: true,
	},
	name: {
		type: String,
		required: true, // Nazwa budżetu (np. "Budżet miesięczny")
	},
	amount: {
		type: Number,
		required: true, // Kwota budżetu
	},
	period: {
		type: String,
		enum: ['weekly', 'monthly', 'yearly'], // Okres budżetowy
		default: 'monthly',
	},
	startDate: {
		type: Date,
		default: Date.now, // Data początkowa budżetu
	},
	endDate: {
		type: Date,
		default: null, // null oznacza budżet bezterminowy
	},
	categoryId: {
		type: mongoose.Schema.Types.ObjectId,
		ref: 'Category', // Kategoria, której dotyczy budżet
		default: null, // null oznacza budżet dla wszystkich kategorii
	},
	isActive: {
		type: Boolean,
		default: true, // Czy budżet jest aktywny
	},
	autoRenew: {
		type: Boolean,
		default: true, // Czy budżet odnawia się automatycznie
	},
	createdAt: {
		type: Date,
		default: Date.now,
	},
	updatedAt: {
		type: Date,
		default: Date.now,
	},
	members: [
		{
			userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
			role: { type: String, enum: ['owner', 'editor', 'viewer'], default: 'viewer' },
			addedAt: { type: Date, default: Date.now },
		},
	],
})

// Aktualizacja daty modyfikacji
BudgetSchema.pre('save', function (next) {
	this.updatedAt = Date.now()
	next()
})

// Schemat celu oszczędnościowego
const SavingGoalSchema = new mongoose.Schema({
	userId: {
		type: mongoose.Schema.Types.ObjectId,
		ref: 'User',
		required: true,
	},
	name: {
		type: String,
		required: true, // Nazwa celu (np. "Wakacje")
	},
	targetAmount: {
		type: Number,
		required: true, // Docelowa kwota oszczędności
	},
	currentAmount: {
		type: Number,
		default: 0, // Aktualna kwota oszczędności
	},
	currency: {
		type: String,
		default: 'PLN',
	},
	startDate: {
		type: Date,
		default: Date.now, // Data rozpoczęcia oszczędzania
	},
	targetDate: {
		type: Date,
		required: true, // Data docelowa osiągnięcia celu
	},
	category: {
		type: String,
		default: 'Oszczędności',
	},
	description: {
		type: String,
		default: '',
	},
	isCompleted: {
		type: Boolean,
		default: false, // Czy cel został osiągnięty
	},
	icon: {
		type: String,
		default: 'piggy-bank',
	},
	color: {
		type: String,
		default: '#27ae60',
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

// Aktualizacja daty modyfikacji
SavingGoalSchema.pre('save', function (next) {
	this.updatedAt = Date.now()
	next()
})

// Metoda do obliczania procentowego ukończenia celu
SavingGoalSchema.methods.getCompletionPercentage = function () {
	return (this.currentAmount / this.targetAmount) * 100
}

// Metoda do obliczania wymaganej dziennej kwoty oszczędności
SavingGoalSchema.methods.getDailySavingsNeeded = function () {
	const now = new Date()
	const daysLeft = Math.max(1, Math.ceil((this.targetDate - now) / (1000 * 60 * 60 * 24)))
	const amountLeft = this.targetAmount - this.currentAmount

	return amountLeft / daysLeft
}

// Tworzenie i eksport modeli
const Budget = mongoose.models.Budget || mongoose.model('Budget', BudgetSchema)
const SavingGoal = mongoose.models.SavingGoal || mongoose.model('SavingGoal', SavingGoalSchema)

export { Budget, SavingGoal }
