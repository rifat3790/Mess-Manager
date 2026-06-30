import mongoose, { Schema, Document } from 'mongoose';

export interface IMealRequest extends Document {
  monthId: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId;
  date: Date;
  breakfast: number;
  lunch: number;
  dinner: number;
  status: 'Pending' | 'Approved' | 'Rejected';
  createdAt: Date;
}

const MealRequestSchema: Schema = new Schema({
  monthId: { type: Schema.Types.ObjectId, ref: 'Month', required: true },
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  date: { type: Date, required: true },
  breakfast: { type: Number, default: 0 },
  lunch: { type: Number, default: 0 },
  dinner: { type: Number, default: 0 },
  status: { type: String, enum: ['Pending', 'Approved', 'Rejected'], default: 'Pending' },
  createdAt: { type: Date, default: Date.now },
});

export default mongoose.models.MealRequest || mongoose.model<IMealRequest>('MealRequest', MealRequestSchema);
