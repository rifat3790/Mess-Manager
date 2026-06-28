import mongoose, { Schema, Document } from 'mongoose';

export interface IUser extends Document {
  firebaseUid: string;
  name: string;
  email: string;
  role: 'Super Admin' | 'Manager' | 'Member' | 'Pending';
  photoURL?: string;
  lastGroupChatRead?: Date;
  createdAt: Date;
}

const UserSchema: Schema = new Schema({
  firebaseUid: { type: String, required: true, unique: true },
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  role: { type: String, enum: ['Super Admin', 'Manager', 'Member', 'Pending'], default: 'Pending' },
  photoURL: { type: String },
  lastGroupChatRead: { type: Date, default: Date.now },
  createdAt: { type: Date, default: Date.now },
});

export default mongoose.models.User || mongoose.model<IUser>('User', UserSchema);
