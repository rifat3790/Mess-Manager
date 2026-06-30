import mongoose, { Schema, Document } from 'mongoose';

export interface IMenu extends Document {
  date: Date;
  breakfast: string;
  lunch: string;
  dinner: string;
  createdAt: Date;
}

const MenuSchema: Schema = new Schema({
  date: { type: Date, required: true, unique: true },
  breakfast: { type: String, default: '' },
  lunch: { type: String, default: '' },
  dinner: { type: String, default: '' },
  createdAt: { type: Date, default: Date.now },
});

export default mongoose.models.Menu || mongoose.model<IMenu>('Menu', MenuSchema);
