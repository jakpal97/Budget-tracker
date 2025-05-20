import mongoose from 'mongoose'

const BudgetInvitationSchema = new mongoose.Schema({
	budget: {
		type: mongoose.Schema.Types.ObjectId,
		ref: 'Budget',
		required: true,
	},
	invitedEmail: {
		type: String,
		required: true,
	},
	token: {
		type: String,
		required: true,
		unique: true,
	},
	status: {
		type: String,
		enum: ['pending', 'accepted', 'rejected'],
		default: 'pending',
	},
	expiresAt: {
		type: Date,
		required: true,
		default: () => new Date(+new Date() + 7 * 24 * 60 * 60 * 1000), // 7 dni
	},
	createdAt: {
		type: Date,
		default: Date.now,
	},
})

// Indeksy dla szybszego wyszukiwania
BudgetInvitationSchema.index({ token: 1 })
BudgetInvitationSchema.index({ invitedEmail: 1 })
BudgetInvitationSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 }) // Automatyczne usuwanie przeterminowanych zaproszeń

export default mongoose.models.BudgetInvitation || mongoose.model('BudgetInvitation', BudgetInvitationSchema)
