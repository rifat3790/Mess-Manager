import mongoose, { Schema, Document } from 'mongoose';

export interface IUser extends Document {
  firebaseUid: string;
  name: string;
  email: string;
  role: 'Super Admin' | 'Manager' | 'Member' | 'Pending';
  photoURL?: string;
  messId?: mongoose.Types.ObjectId;
  lastGroupChatRead?: Date;
  permissions?: {
    canManageMeals: boolean;
    canManageExpenses: boolean;
    canManageDeposits: boolean;
    canManageNotices: boolean;
    canManageBazaar: boolean;
  };
  createdAt: Date;
}

const UserSchema: Schema = new Schema({
  firebaseUid: { type: String, required: true, unique: true },
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  role: { type: String, enum: ['Super Admin', 'Manager', 'Member', 'Pending'], default: 'Pending' },
  photoURL: { type: String },
  messId: { type: Schema.Types.ObjectId, ref: 'Mess', index: true },
  lastGroupChatRead: { type: Date, default: Date.now },
  permissions: {
    canManageMeals: { type: Boolean, default: false },
    canManageExpenses: { type: Boolean, default: false },
    canManageDeposits: { type: Boolean, default: false },
    canManageNotices: { type: Boolean, default: false },
    canManageBazaar: { type: Boolean, default: false }
  },
  createdAt: { type: Date, default: Date.now },
});

UserSchema.index({ messId: 1, role: 1 });

export default mongoose.models.User || mongoose.model<IUser>('User', UserSchema);
