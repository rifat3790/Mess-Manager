"use server";

import connectToDatabase from "@/lib/mongoose";
import Notification from "@/models/Notification";

import Month from "@/models/Month";

export async function getNotifications(userId: string) {
  try {
    await connectToDatabase();
    
    const activeMonth = await Month.findOne({ isActive: true });
    
    // Get notifications specifically for this user OR global ones (userId = null)
    const query: any = {
      $or: [
        { userId: userId },
        { userId: { $exists: false } },
        { userId: null }
      ]
    };

    if (activeMonth && activeMonth.startDate) {
      query.createdAt = { $gte: new Date(activeMonth.startDate) };
      // Async background deletion of previous months' notifications to clean database
      Notification.deleteMany({ createdAt: { $lt: new Date(activeMonth.startDate) } }).catch(err => {
        console.error("Pruning old notifications failed:", err);
      });
    }
    
    const notifications = await Notification.find(query).sort({ createdAt: -1 }).limit(20);
    
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

export async function createNotification(title: string, message: string, userId?: string) {
  try {
    await connectToDatabase();
    await Notification.create({
      title,
      message,
      userId: userId || null
    });
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}
