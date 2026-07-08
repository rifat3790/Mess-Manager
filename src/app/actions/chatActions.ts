"use server";

import connectToDatabase from "@/lib/mongoose";
import ChatMessage from "@/models/ChatMessage";
import User from "@/models/User";
import mongoose from "mongoose";

export async function getGroupMessages() {
  try {
    await connectToDatabase();
    const messages = await ChatMessage.find({ isGroup: true })
      .populate('senderId', 'name photoURL role')
      .sort({ createdAt: 1 })
      .limit(100);
    return { success: true, messages: JSON.parse(JSON.stringify(messages)) };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function getDirectMessages(userId: string) {
  try {
    await connectToDatabase();
    
    // Fetch all private messages involving this user (either as sender or receiver)
    const messages = await ChatMessage.find({
      isGroup: false,
      $or: [
        { senderId: userId },
        { receiverId: userId }
      ]
    })
      .populate('senderId', 'name photoURL role')
      .populate('receiverId', 'name photoURL role')
      .sort({ createdAt: 1 })
      .limit(300);

    return { success: true, messages: JSON.parse(JSON.stringify(messages)) };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function sendGroupMessage(senderId: string, message: string) {
  try {
    await connectToDatabase();
    const msg = await ChatMessage.create({
      senderId,
      message,
      isGroup: true
    });
    
    const populated = await ChatMessage.findById(msg._id).populate('senderId', 'name photoURL role');
    return { success: true, message: JSON.parse(JSON.stringify(populated)) };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function sendDirectMessage(senderId: string, receiverId: string, message: string) {
  try {
    await connectToDatabase();
    
    const msg = await ChatMessage.create({
      senderId,
      receiverId,
      message,
      isGroup: false,
      isRead: false
    });
    
    const populated = await ChatMessage.findById(msg._id)
      .populate('senderId', 'name photoURL role')
      .populate('receiverId', 'name photoURL role');
      
    return { success: true, message: JSON.parse(JSON.stringify(populated)) };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function getUnreadCount(userId: string) {
  try {
    await connectToDatabase();
    
    // Unread direct messages
    const directCount = await ChatMessage.countDocuments({
      receiverId: new mongoose.Types.ObjectId(userId),
      isGroup: false,
      isRead: { $ne: true }
    });
    
    // Unread group messages
    const user = await User.findById(userId);
    const lastRead = user?.lastGroupChatRead || new Date(0);
    const groupCount = await ChatMessage.countDocuments({
      isGroup: true,
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
    await ChatMessage.updateMany(
      { 
        receiverId: new mongoose.Types.ObjectId(userId), 
        senderId: new mongoose.Types.ObjectId(senderId), 
        isGroup: false, 
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
