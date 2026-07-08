"use server";

import connectToDatabase from "@/lib/mongoose";
import ChatMessage from "@/models/ChatMessage";
import User from "@/models/User";
import mongoose from "mongoose";

export async function getGroupMessages(userId: string) {
  try {
    await connectToDatabase();
    const user = await User.findById(userId).lean();
    if (!user || !user.messId) return { success: false, error: "Mess not found" };

    const messages = await ChatMessage.find({ isGroup: true, messId: user.messId })
      .populate('senderId', 'name photoURL role')
      .sort({ createdAt: 1 })
      .limit(100)
      .lean();
    return { success: true, messages: JSON.parse(JSON.stringify(messages)) };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function getDirectMessages(userId: string) {
  try {
    await connectToDatabase();
    const user = await User.findById(userId).lean();
    if (!user || !user.messId) return { success: false, error: "Mess not found" };
    
    // Fetch all private messages involving this user in this mess
    const messages = await ChatMessage.find({
      isGroup: false,
      messId: user.messId,
      $or: [
        { senderId: userId },
        { receiverId: userId }
      ]
    })
      .populate('senderId', 'name photoURL role')
      .populate('receiverId', 'name photoURL role')
      .sort({ createdAt: 1 })
      .limit(300)
      .lean();

    return { success: true, messages: JSON.parse(JSON.stringify(messages)) };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function sendGroupMessage(senderId: string, message: string) {
  try {
    await connectToDatabase();
    const user = await User.findById(senderId).lean();
    if (!user || !user.messId) return { success: false, error: "Mess not found" };

    const msg = await ChatMessage.create({
      senderId,
      message,
      isGroup: true,
      messId: user.messId
    });
    
    const populated = await ChatMessage.findById(msg._id).populate('senderId', 'name photoURL role').lean();
    return { success: true, message: JSON.parse(JSON.stringify(populated)) };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function sendDirectMessage(senderId: string, receiverId: string, message: string) {
  try {
    await connectToDatabase();
    const user = await User.findById(senderId).lean();
    if (!user || !user.messId) return { success: false, error: "Mess not found" };
    
    const msg = await ChatMessage.create({
      senderId,
      receiverId,
      message,
      isGroup: false,
      isRead: false,
      messId: user.messId
    });
    
    const populated = await ChatMessage.findById(msg._id)
      .populate('senderId', 'name photoURL role')
      .populate('receiverId', 'name photoURL role')
      .lean();
      
    return { success: true, message: JSON.parse(JSON.stringify(populated)) };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function getUnreadCount(userId: string) {
  try {
    await connectToDatabase();
    
    const user = await User.findById(userId).select('lastGroupChatRead messId').lean();
    if (!user || !user.messId) return { success: true, count: 0 };

    // Unread direct messages
    const directCount = await ChatMessage.countDocuments({
      receiverId: new mongoose.Types.ObjectId(userId),
      isGroup: false,
      messId: user.messId,
      isRead: { $ne: true }
    });
    
    // Unread group messages
    const lastRead = user.lastGroupChatRead || new Date(0);
    const groupCount = await ChatMessage.countDocuments({
      isGroup: true,
      messId: user.messId,
      createdAt: { $gt: lastRead }
    });

    return { success: true, count: directCount + groupCount };
  } catch (error: any) {
    return { success: false, count: 0 };
  }
}

export async function markMessagesAsRead(userId: string, senderId: string) {
  try {
    await connectToDatabase();
    const user = await User.findById(userId).lean();
    if (!user || !user.messId) return { success: false, error: "Mess not found" };

    await ChatMessage.updateMany(
      { 
        receiverId: new mongoose.Types.ObjectId(userId), 
        senderId: new mongoose.Types.ObjectId(senderId), 
        isGroup: false, 
        messId: user.messId,
        isRead: { $ne: true } 
      },
      { $set: { isRead: true } }
    );
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function markGroupMessagesAsRead(userId: string) {
  try {
    await connectToDatabase();
    await User.findByIdAndUpdate(new mongoose.Types.ObjectId(userId), { lastGroupChatRead: new Date() });
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}
