"use server";

import connectToDatabase from "@/lib/mongoose";
import Settings from "@/models/Settings";
import Month from "@/models/Month";
import Meal from "@/models/Meal";
import Expense from "@/models/Expense";
import Deposit from "@/models/Deposit";
import User from "@/models/User";
import BazaarSchedule from "@/models/BazaarSchedule";
import Notification from "@/models/Notification";

export async function getSettings() {
  try {
    await connectToDatabase();
    let settings = await Settings.findOne();
    if (!settings) {
      settings = await Settings.create({});
    }
    return { success: true, settings: JSON.parse(JSON.stringify(settings)) };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function updateSettings(updates: any) {
  try {
    await connectToDatabase();
    let settings = await Settings.findOne();
    if (!settings) {
      settings = new Settings();
    }
    if (updates.visibleTabs !== undefined) {
      settings.visibleTabs = { ...settings.visibleTabs, ...updates.visibleTabs };
    }
    if (updates.messName !== undefined) {
      settings.messName = updates.messName;
    }
    await settings.save();
    return { success: true, settings: JSON.parse(JSON.stringify(settings)) };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function deleteEntireMess(confirmText: string) {
  if (confirmText !== "DELETE MESS") {
    return { success: false, error: "Confirmation text did not match." };
  }

  try {
    await connectToDatabase();
    
    // Delete all collections
    await Promise.all([
      Month.deleteMany({}),
      Meal.deleteMany({}),
      Expense.deleteMany({}),
      Deposit.deleteMany({}),
      User.deleteMany({ role: { $ne: 'Super Admin' } }), // Keep Super Admin to allow recreation
      BazaarSchedule.deleteMany({}),
      Notification.deleteMany({}),
      Settings.deleteMany({})
    ]);

    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}
