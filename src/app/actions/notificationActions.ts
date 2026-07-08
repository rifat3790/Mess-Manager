"use server";

import connectToDatabase from "@/lib/mongoose";
import Notification from "@/models/Notification";
import Month from "@/models/Month";
import User from "@/models/User";
import mongoose from "mongoose";

export async function getNotifications(userId: string) {
  try {
    await connectToDatabase();
    
    const user = await User.findById(userId).lean();
    if (!user) return { success: false, error: "User not found" };

    const activeMonth = await Month.findOne({ isActive: true, messId: user.messId }).lean();
    
    let query: any;
    if (user.role === 'Super Admin') {
      query = { userId: new mongoose.Types.ObjectId(userId) };
    } else {
      if (!user.messId) {
        query = { userId: new mongoose.Types.ObjectId(userId) };
      } else {
        query = {
          $or: [
            { userId: new mongoose.Types.ObjectId(userId) },
            { messId: user.messId, userId: { $exists: false } },
            { messId: user.messId, userId: null }
          ]
        };
      }
    }

    if (activeMonth && activeMonth.startDate) {
      query.createdAt = { $gte: new Date(activeMonth.startDate) };
    }
    
    const notifications = await Notification.find(query).sort({ createdAt: -1 }).limit(20).lean();
    
    return { success: true, notifications: JSON.parse(JSON.stringify(notifications)) };
  } catch (error: any) {
    console.error("Fetch notifications error:", error);
    return { success: false, error: error.message };
  }
}

export async function markAsRead(notificationId: string) {
  try {
    await connectToDatabase();
    await Notification.findByIdAndUpdate(notificationId, { isRead: true });
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function createNotification(title: string, message: string, userId?: string, messId?: string) {
  try {
    await connectToDatabase();

    let resolvedMessId = messId;
    if (!resolvedMessId && userId) {
      const user = await User.findById(userId).lean();
      if (user && user.messId) {
        resolvedMessId = user.messId.toString();
      }
    }

    await Notification.create({
      title,
      message,
      userId: userId ? new mongoose.Types.ObjectId(userId) : undefined,
      messId: resolvedMessId ? new mongoose.Types.ObjectId(resolvedMessId) : undefined
    });
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}
