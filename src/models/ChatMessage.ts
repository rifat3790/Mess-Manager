import mongoose, { Schema, Document } from 'mongoose';

export interface IChatMessage extends Document {
  senderId: mongoose.Types.ObjectId;
  receiverId?: mongoose.Types.ObjectId; // null for group chat
  message: string;
  isGroup: boolean;
  isRead: boolean;
  messId: mongoose.Types.ObjectId;
  createdAt: Date;
}

const ChatMessageSchema: Schema = new Schema({
  senderId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  receiverId: { type: Schema.Types.ObjectId, ref: 'User' },
  message: { type: String, required: true },
  isGroup: { type: Boolean, default: false },
  isRead: { type: Boolean, default: false },
  messId: { type: Schema.Types.ObjectId, ref: 'Mess', required: true, index: true },
  createdAt: { type: Date, default: Date.now },
});

export default mongoose.models.ChatMessage || mongoose.model<IChatMessage>('ChatMessage', ChatMessageSchema);
