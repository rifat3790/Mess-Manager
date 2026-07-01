import mongoose, { Schema, Document } from 'mongoose';

export interface IBazaarChecklist extends Document {
  item: string;
  isCompleted: boolean;
  createdAt: Date;
}

const BazaarChecklistSchema: Schema = new Schema({
  item: { type: String, required: true },
  isCompleted: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now }
});

export default mongoose.models.BazaarChecklist || mongoose.model<IBazaarChecklist>('BazaarChecklist', BazaarChecklistSchema);
