"use server";

import connectToDatabase from "@/lib/mongoose";
import Month from "@/models/Month";
import Meal from "@/models/Meal";
import Expense from "@/models/Expense";
import Deposit from "@/models/Deposit";
import User from "@/models/User";
import BazaarSchedule from "@/models/BazaarSchedule";
import Notification from "@/models/Notification";
import Mess from "@/models/Mess";
import Notice from "@/models/Notice";
import BazaarChecklist from "@/models/BazaarChecklist";
import ChatMessage from "@/models/ChatMessage";
import MealRequest from "@/models/MealRequest";
import mongoose from "mongoose";

export async function getSettings(userId: string) {
  try {
    await connectToDatabase();
    const user = await User.findById(userId).lean();
    if (!user || !user.messId) {
      return { success: false, error: "Mess not found." };
    }
    
    const mess = await Mess.findById(user.messId).lean();
    if (!mess) {
      return { success: false, error: "Mess not found." };
    }

    const settings = {
      visibleTabs: mess.visibleTabs,
      messName: mess.name,
      code: mess.code
    };
    
    return { success: true, settings };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function updateSettings(updates: any, adminUserId: string) {
  try {
    await connectToDatabase();
    const admin = await User.findById(adminUserId).lean();
    if (!admin || (admin.role !== 'Super Admin' && admin.role !== 'Manager') || !admin.messId) {
      return { success: false, error: 'Unauthorized.' };
    }

    const mess = await Mess.findById(admin.messId);
    if (!mess) {
      return { success: false, error: 'Mess not found.' };
    }

    if (updates.visibleTabs !== undefined) {
      mess.visibleTabs = { ...mess.visibleTabs, ...updates.visibleTabs };
    }
    if (updates.messName !== undefined) {
      mess.name = updates.messName;
    }
    await mess.save();

    const settings = {
      visibleTabs: mess.visibleTabs,
      messName: mess.name,
      code: mess.code
    };

    return { success: true, settings: JSON.parse(JSON.stringify(settings)) };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function deleteEntireMess(confirmText: string, adminUserId: string) {
  if (confirmText !== "DELETE MESS") {
    return { success: false, error: "Confirmation text did not match." };
  }

  try {
    await connectToDatabase();
    const admin = await User.findById(adminUserId);
    if (!admin || admin.role !== 'Manager' || !admin.messId) {
      return { success: false, error: 'Unauthorized.' };
    }

    const messId = admin.messId;

    const months = await Month.find({ messId }).select('_id').lean();
    const monthIds = months.map(m => m._id);

    await Promise.all([
      Month.deleteMany({ messId }),
      Meal.deleteMany({ monthId: { $in: monthIds } }),
      Expense.deleteMany({ monthId: { $in: monthIds } }),
      Deposit.deleteMany({ monthId: { $in: monthIds } }),
      BazaarSchedule.deleteMany({ monthId: { $in: monthIds } }),
      MealRequest.deleteMany({ monthId: { $in: monthIds } }),
      Notice.deleteMany({ messId }),
      BazaarChecklist.deleteMany({ messId }),
      ChatMessage.deleteMany({ messId }),
      Notification.deleteMany({ messId }),
      User.updateMany({ messId }, { $unset: { messId: "" }, $set: { role: 'Pending' } }),
      Mess.findByIdAndDelete(messId)
    ]);

    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}
