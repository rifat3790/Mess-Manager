import mongoose, { Schema, Document } from 'mongoose';

export interface IExpense extends Document {
  monthId: mongoose.Types.ObjectId;
  userId?: mongoose.Types.ObjectId; // User who made the expense (or single cost target)
  sharedBetween?: mongoose.Types.ObjectId[]; // Array of user IDs for targeted shared cost
  type: 'Meal' | 'Joint' | 'Single';
  amount: number;
  description: string;
  date: Date;
  createdAt: Date;
}

const ExpenseSchema: Schema = new Schema({
  monthId: { type: Schema.Types.ObjectId, ref: 'Month', required: true, index: true },
  userId: { type: Schema.Types.ObjectId, ref: 'User', index: true },
  sharedBetween: [{ type: Schema.Types.ObjectId, ref: 'User', index: true }],
  type: { type: String, enum: ['Meal', 'Joint', 'Single'], required: true },
  amount: { type: Number, required: true },
  description: { type: String, required: true },
  date: { type: Date, required: true },
  createdAt: { type: Date, default: Date.now },
});

export default mongoose.models.Expense || mongoose.model<IExpense>('Expense', ExpenseSchema);
