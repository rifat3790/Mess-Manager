import mongoose, { Schema, Document } from 'mongoose';

export interface IDeposit extends Document {
  monthId: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId;
  amount: number;
  date: Date;
  createdAt: Date;
}

const DepositSchema: Schema = new Schema({
  monthId: { type: Schema.Types.ObjectId, ref: 'Month', required: true, index: true },
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  amount: { type: Number, required: true },
  date: { type: Date, required: true },
  createdAt: { type: Date, default: Date.now },
});

export default mongoose.models.Deposit || mongoose.model<IDeposit>('Deposit', DepositSchema);
