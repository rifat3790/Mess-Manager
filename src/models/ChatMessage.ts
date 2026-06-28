import mongoose, { Schema, Document } from 'mongoose';

export interface IChatMessage extends Document {
  senderId: mongoose.Types.ObjectId;
  receiverId?: mongoose.Types.ObjectId; // null for group chat
  message: string;
  isGroup: boolean;
  isRead: boolean;
  createdAt: Date;
}

const ChatMessageSchema: Schema = new Schema({
  senderId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  receiverId: { type: Schema.Types.ObjectId, ref: 'User' },
  message: { type: String, required: true },
  isGroup: { type: Boolean, default: false },
  isRead: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now },
});

export default mongoose.models.ChatMessage || mongoose.model<IChatMessage>('ChatMessage', ChatMessageSchema);
