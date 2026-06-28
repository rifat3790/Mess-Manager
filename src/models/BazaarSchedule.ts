import mongoose, { Schema, Document } from 'mongoose';

export interface IBazaarSchedule extends Document {
  monthId: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId;
  fromDate: Date;
  toDate: Date;
  status: 'Pending' | 'Approved' | 'Completed';
  createdAt: Date;
}

const BazaarScheduleSchema: Schema = new Schema({
  monthId: { type: Schema.Types.ObjectId, ref: 'Month', required: true },
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  fromDate: { type: Date, required: true },
  toDate: { type: Date, required: true },
  status: { type: String, enum: ['Pending', 'Approved', 'Completed'], default: 'Pending' },
  createdAt: { type: Date, default: Date.now },
});

export default mongoose.models.BazaarSchedule || mongoose.model<IBazaarSchedule>('BazaarSchedule', BazaarScheduleSchema);
