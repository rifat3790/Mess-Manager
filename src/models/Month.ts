import mongoose, { Schema, Document } from 'mongoose';

export interface IMonth extends Document {
  name: string; // e.g. "June 26"
  startDate: Date;
  endDate?: Date;
  isActive: boolean;
  messId: mongoose.Types.ObjectId;
  totalMeals: number;
  totalMealCost: number;
  totalJointCost: number;
  totalDeposit: number;
  mealRate: number;
  sheetTabName: string;
  createdAt: Date;
}

const MonthSchema: Schema = new Schema({
  name: { type: String, required: true },
  startDate: { type: Date, required: true },
  endDate: { type: Date },
  isActive: { type: Boolean, default: true },
  messId: { type: Schema.Types.ObjectId, ref: 'Mess', required: true, index: true },
  totalMeals: { type: Number, default: 0 },
  totalMealCost: { type: Number, default: 0 },
  totalJointCost: { type: Number, default: 0 },
  totalDeposit: { type: Number, default: 0 },
  mealRate: { type: Number, default: 0 },
  sheetTabName: { type: String, required: true },
  createdAt: { type: Date, default: Date.now },
});

MonthSchema.index({ isActive: 1, messId: 1 });
MonthSchema.index({ messId: 1, createdAt: -1 });

export default mongoose.models.Month || mongoose.model<IMonth>('Month', MonthSchema);
