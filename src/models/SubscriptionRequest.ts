import mongoose, { Schema, Document } from 'mongoose';

export interface ISubscriptionRequest extends Document {
  messId: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId;
  paymentMethod: 'bKash' | 'Nagad' | 'Rocket';
  senderPhone: string;
  trxId: string;
  amount: number;
  months: number;
  status: 'Pending' | 'Approved' | 'Rejected';
  adminNote?: string;
  messages?: Array<{
    senderRole: 'Super Admin' | 'User';
    senderName: string;
    text: string;
    createdAt: Date;
  }>;
  createdAt: Date;
  approvedAt?: Date;
}

const SubscriptionRequestSchema: Schema = new Schema({
  messId: { type: Schema.Types.ObjectId, ref: 'Mess', required: true, index: true },
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  paymentMethod: { type: String, enum: ['bKash', 'Nagad', 'Rocket'], required: true },
  senderPhone: { type: String, required: true },
  trxId: { type: String, required: true },
  amount: { type: Number, required: true },
  months: { type: Number, required: true, default: 1 },
  status: { type: String, enum: ['Pending', 'Approved', 'Rejected'], default: 'Pending', index: true },
  adminNote: { type: String },
  messages: [{
    senderRole: { type: String, enum: ['Super Admin', 'User'], required: true },
    senderName: { type: String, required: true },
    text: { type: String, required: true },
    createdAt: { type: Date, default: Date.now }
  }],
  createdAt: { type: Date, default: Date.now },
  approvedAt: { type: Date }
});

export default mongoose.models.SubscriptionRequest || mongoose.model<ISubscriptionRequest>('SubscriptionRequest', SubscriptionRequestSchema);
