import mongoose, { Schema, Document } from 'mongoose';

export interface ISettings extends Document {
  visibleTabs: {
    addMeal: boolean;
    addExpense: boolean;
    addDeposit: boolean;
    history: boolean;
    ledger: boolean;
  };
  messName: string;
  createdAt: Date;
}

const SettingsSchema: Schema = new Schema({
  visibleTabs: {
    addMeal: { type: Boolean, default: true },
    addExpense: { type: Boolean, default: true },
    addDeposit: { type: Boolean, default: false }, // Only admins by default
    history: { type: Boolean, default: true },
    ledger: { type: Boolean, default: true },
  },
  messName: { type: String, default: "Mohakhali Mess" },
  createdAt: { type: Date, default: Date.now },
});

export default mongoose.models.Settings || mongoose.model<ISettings>('Settings', SettingsSchema);
