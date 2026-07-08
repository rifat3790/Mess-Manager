import mongoose, { Schema, Document } from 'mongoose';

export interface IContact extends Document {
  designation: string;
  name: string;
  phone: string;
  messId: mongoose.Types.ObjectId;
  createdAt: Date;
}

const ContactSchema: Schema = new Schema({
  designation: { type: String, required: true },
  name: { type: String, required: true },
  phone: { type: String, required: true },
  messId: { type: Schema.Types.ObjectId, ref: 'Mess', required: true, index: true },
  createdAt: { type: Date, default: Date.now },
});

export default mongoose.models.Contact || mongoose.model<IContact>('Contact', ContactSchema);
