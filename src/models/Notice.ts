import mongoose, { Schema, Document } from 'mongoose';

export interface INotice extends Document {
  title: string;
  content: string;
  createdBy: mongoose.Types.ObjectId;
  acknowledgedBy: mongoose.Types.ObjectId[];
  messId: mongoose.Types.ObjectId;
  createdAt: Date;
}

const NoticeSchema: Schema = new Schema({
  title: { type: String, required: true },
  content: { type: String, required: true },
  createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  acknowledgedBy: [{ type: Schema.Types.ObjectId, ref: 'User', default: [] }],
  messId: { type: Schema.Types.ObjectId, ref: 'Mess', required: true, index: true },
  createdAt: { type: Date, default: Date.now },
});

export default mongoose.models.Notice || mongoose.model<INotice>('Notice', NoticeSchema);
