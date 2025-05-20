import mongoose from 'mongoose'

const NotificationSchema = new mongoose.Schema({
	userId: {
		type: mongoose.Schema.Types.ObjectId,
		ref: 'User',
		required: true,
	},
	budgetId: {
		type: mongoose.Schema.Types.ObjectId,
		ref: 'SharedBudget',
		required: true,
	},
	type: {
		type: String,
		enum: ['new_receipt', 'budget_limit', 'settlement_reminder'],
		required: true,
	},
	title: {
		type: String,
		required: true,
	},
	message: {
		type: String,
		required: true,
	},
	isRead: {
		type: Boolean,
		default: false,
	},
	createdAt: {
		type: Date,
		default: Date.now,
	},
})

export default mongoose.models.Notification || mongoose.model('Notification', NotificationSchema)
