import mongoose, { Schema, Document } from 'mongoose';

export interface IContact extends Document {
  designation: string;
  name: string;
  phone: string;
  createdAt: Date;
}

const ContactSchema: Schema = new Schema({
  designation: { type: String, required: true },
  name: { type: String, required: true },
  phone: { type: String, required: true },
  createdAt: { type: Date, default: Date.now },
});

export default mongoose.models.Contact || mongoose.model<IContact>('Contact', ContactSchema);
