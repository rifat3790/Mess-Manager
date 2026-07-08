import mongoose, { Schema, Document } from 'mongoose';

export interface IMenu extends Document {
  date: Date;
  breakfast: string;
  lunch: string;
  dinner: string;
  messId: mongoose.Types.ObjectId;
  createdAt: Date;
}

const MenuSchema: Schema = new Schema({
  date: { type: Date, required: true },
  breakfast: { type: String, default: '' },
  lunch: { type: String, default: '' },
  dinner: { type: String, default: '' },
  messId: { type: Schema.Types.ObjectId, ref: 'Mess', required: true, index: true },
  createdAt: { type: Date, default: Date.now },
});

MenuSchema.index({ messId: 1, date: 1 }, { unique: true });

export default mongoose.models.Menu || mongoose.model<IMenu>('Menu', MenuSchema);
