import mongoose, { Schema, Document } from 'mongoose';

export interface IBazaarChecklist extends Document {
  item: string;
  isCompleted: boolean;
  messId: mongoose.Types.ObjectId;
  createdAt: Date;
}

const BazaarChecklistSchema: Schema = new Schema({
  item: { type: String, required: true },
  isCompleted: { type: Boolean, default: false },
  messId: { type: Schema.Types.ObjectId, ref: 'Mess', required: true, index: true },
  createdAt: { type: Date, default: Date.now }
});

export default mongoose.models.BazaarChecklist || mongoose.model<IBazaarChecklist>('BazaarChecklist', BazaarChecklistSchema);
