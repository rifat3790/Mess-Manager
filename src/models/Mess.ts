import mongoose, { Schema, Document } from 'mongoose';

export interface IMess extends Document {
  name: string;
  code: string; // Unique join code, e.g. MESS-ABCD
  creatorId: mongoose.Types.ObjectId; // ref User
  status?: 'Active' | 'Suspended';
  subscriptionStatus?: 'Active' | 'Expired' | 'None';
  subscriptionExpiresAt?: Date;
  subscriptionPlanMonths?: number;
  lastPaymentTrxId?: string;
  visibleTabs: {
    addMeal: boolean;
    addExpense: boolean;
    addDeposit: boolean;
    history: boolean;
    ledger: boolean;
  };
  createdAt: Date;
}

const MessSchema: Schema = new Schema({
  name: { type: String, required: true },
  code: { type: String, required: true, unique: true, index: true },
  creatorId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  status: { type: String, enum: ['Active', 'Suspended'], default: 'Active' },
  subscriptionStatus: { type: String, enum: ['Active', 'Expired', 'None'], default: 'None' },
  subscriptionExpiresAt: { type: Date },
  subscriptionPlanMonths: { type: Number, default: 0 },
  lastPaymentTrxId: { type: String },
  visibleTabs: {
    addMeal: { type: Boolean, default: true },
    addExpense: { type: Boolean, default: true },
    addDeposit: { type: Boolean, default: false },
    history: { type: Boolean, default: true },
    ledger: { type: Boolean, default: true },
  },
  createdAt: { type: Date, default: Date.now }
});

export default mongoose.models.Mess || mongoose.model<IMess>('Mess', MessSchema);
