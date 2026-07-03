import mongoose, { Schema, Document } from 'mongoose';

export interface INotification extends Document {
  title: string;
  message: string;
  userId?: mongoose.Types.ObjectId; // Optional: If null, it's a global broadcast to all
  isRead: boolean;
  createdAt: Date;
}

const NotificationSchema: Schema = new Schema({
  title: { type: String, required: true },
  message: { type: String, required: true },
  userId: { type: Schema.Types.ObjectId, ref: 'User', index: true },
  isRead: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now },
});

export default mongoose.models.Notification || mongoose.model<INotification>('Notification', NotificationSchema);
