import mongoose, { Schema, Document } from 'mongoose';

export interface IMeal extends Document {
  monthId: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId;
  date: Date;
  breakfast: number;
  lunch: number;
  dinner: number;
  mealCount: number;
  createdAt: Date;
}

const MealSchema: Schema = new Schema({
  monthId: { type: Schema.Types.ObjectId, ref: 'Month', required: true },
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  date: { type: Date, required: true },
  breakfast: { type: Number, default: 0 },
  lunch: { type: Number, default: 0 },
  dinner: { type: Number, default: 0 },
  mealCount: { type: Number, required: true, default: 0 },
  createdAt: { type: Date, default: Date.now },
});

export default mongoose.models.Meal || mongoose.model<IMeal>('Meal', MealSchema);
