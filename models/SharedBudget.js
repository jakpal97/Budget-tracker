import mongoose from 'mongoose'

const SharedBudgetSchema = new mongoose.Schema(
	{
		name: {
			type: String,
			required: [true, 'Nazwa budżetu jest wymagana'],
		},
		monthlyBudget: {
			type: Number,
			required: [true, 'Limit miesięczny jest wymagany'],
			min: [0, 'Limit nie może być ujemny'],
		},
		members: [
			{
				userId: {
					type: mongoose.Schema.Types.ObjectId,
					required: true,
				},
				email: String,
				role: {
					type: String,
					enum: ['owner', 'member'],
					default: 'member',
				},
			},
		],
		categories: [
			{
				type: mongoose.Schema.Types.ObjectId,
				ref: 'Category',
			},
		],
	},
	{
		timestamps: true,
	}
)

export default mongoose.models.SharedBudget || mongoose.model('SharedBudget', SharedBudgetSchema)
