import mongoose, { Schema, Document } from 'mongoose';

export interface IMenuRating extends Document {
  userId: mongoose.Types.ObjectId;
  date: Date;
  breakfast: number;
  lunch: number;
  dinner: number;
  createdAt: Date;
}

const MenuRatingSchema: Schema = new Schema({
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  date: { type: Date, required: true },
  breakfast: { type: Number, default: 0 },
  lunch: { type: Number, default: 0 },
  dinner: { type: Number, default: 0 },
  createdAt: { type: Date, default: Date.now },
});

MenuRatingSchema.index({ userId: 1, date: 1 }, { unique: true });

export default mongoose.models.MenuRating || mongoose.model<IMenuRating>('MenuRating', MenuRatingSchema);
