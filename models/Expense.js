import mongoose from 'mongoose'

const ExpenseSchema = new mongoose.Schema(
	{
		title: {
			type: String,
			required: [true, 'Tytuł wydatku jest wymagany'],
		},
		amount: {
			type: Number,
			required: [true, 'Kwota wydatku jest wymagana'],
		},
		date: {
			type: Date,
			required: [true, 'Data wydatku jest wymagana'],
		},
		categoryId: {
			type: mongoose.Schema.Types.ObjectId,
			ref: 'Category',
		},
		userId: {
			type: mongoose.Schema.Types.ObjectId,
			required: true,
		},
		type: {
			type: String,
			enum: ['personal', 'shared'],
			default: 'personal',
		},
		sharedBudgetId: {
			type: mongoose.Schema.Types.ObjectId,
			ref: 'SharedBudget',
			required: function () {
				return this.type === 'shared'
			},
		},
	},
	{
		timestamps: true,
	}
)

export default mongoose.models.Expense || mongoose.model('Expense', ExpenseSchema)
