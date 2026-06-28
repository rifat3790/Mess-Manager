"use server";

import connectToDatabase from "@/lib/mongoose";
import Notification from "@/models/Notification";

export async function getNotifications(userId: string) {
  try {
    await connectToDatabase();
    
    // Get notifications specifically for this user OR global ones (userId = null)
    const notifications = await Notification.find({
      $or: [
        { userId: userId },
        { userId: { $exists: false } },
        { userId: null }
      ]
    }).sort({ createdAt: -1 }).limit(20);
    
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
