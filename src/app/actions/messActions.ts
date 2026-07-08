"use server";

import connectToDatabase from "@/lib/mongoose";
import Mess from "@/models/Mess";
import User from "@/models/User";
import Notification from "@/models/Notification";
import mongoose from "mongoose";
import { revalidatePath } from "next/cache";

export async function createMess(name: string, userId: string) {
  try {
    await connectToDatabase();

    const user = await User.findById(userId);
    if (!user) {
      return { success: false, error: "User not found." };
    }

    // Generate unique 6-digit uppercase alphanumeric code
    let code = "";
    let codeExists = true;
    while (codeExists) {
      code = Math.random().toString(36).substring(2, 8).toUpperCase();
      const existing = await Mess.findOne({ code });
      if (!existing) {
        codeExists = false;
      }
    }

    const newMess = await Mess.create({
      name,
      code,
      creatorId: new mongoose.Types.ObjectId(userId),
    });

    await User.findByIdAndUpdate(userId, {
      messId: newMess._id,
      role: "Manager",
    });

    revalidatePath("/", "layout");
    return { success: true, mess: JSON.parse(JSON.stringify(newMess)) };
  } catch (error: any) {
    console.error("Error creating mess:", error);
    return { success: false, error: error.message };
  }
}

export async function joinMess(code: string, userId: string) {
  try {
    await connectToDatabase();

    const user = await User.findById(userId);
    if (!user) {
      return { success: false, error: "User not found." };
    }

    const mess = await Mess.findOne({ code: code.trim().toUpperCase() });
    if (!mess) {
      return { success: false, error: "মেস কোডটি সঠিক নয়। অনুগ্রহ করে আবার চেষ্টা করুন।" };
    }

    await User.findByIdAndUpdate(userId, {
      messId: mess._id,
      role: "Pending",
    });

    // Notify the mess creator/manager
    await Notification.create({
      title: "নতুন জয়েন রিকোয়েস্ট 🔔",
      message: `${user.name} আপনার মেসে জয়েন করার জন্য রিকোয়েস্ট পাঠিয়েছেন। মেম্বার তালিকা থেকে তাকে এক্সেপ্ট করুন।`,
      messId: mess._id,
      userId: mess.creatorId,
    });

    revalidatePath("/", "layout");
    return { success: true, mess: JSON.parse(JSON.stringify(mess)) };
  } catch (error: any) {
    console.error("Error joining mess:", error);
    return { success: false, error: error.message };
  }
}
