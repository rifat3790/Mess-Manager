"use server";

import connectToDatabase from "@/lib/mongoose";
import BazaarSchedule from "@/models/BazaarSchedule";
import Month from "@/models/Month";
import User from "@/models/User";
import BazaarChecklist from "@/models/BazaarChecklist";
import { createNotification } from "./notificationActions";

export async function getBazaarSchedules(userId: string) {
  try {
    await connectToDatabase();
    const user = await User.findById(userId).lean();
    if (!user || !user.messId) return { success: false, error: "Mess not found" };

    const activeMonth = await Month.findOne({ isActive: true, messId: user.messId }).lean();
    if (!activeMonth) return { success: true, schedules: [] };

    const schedules = await BazaarSchedule.find({ monthId: activeMonth._id })
      .populate('userId', 'name email')
      .sort({ fromDate: 1 })
      .lean();
    return { success: true, schedules: JSON.parse(JSON.stringify(schedules)) };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function requestBazaarSchedule(userId: string, fromDate: Date, toDate: Date) {
  try {
    await connectToDatabase();
    const user = await User.findById(userId).lean();
    if (!user || !user.messId) return { success: false, error: "Mess not found" };

    const activeMonth = await Month.findOne({ isActive: true, messId: user.messId }).lean();
    if (!activeMonth) return { success: false, error: "No active month" };

    const schedule = new BazaarSchedule({
      monthId: activeMonth._id,
      userId,
      fromDate,
      toDate,
      status: 'Pending'
    });
    await schedule.save();

    await createNotification(
      "বাজারের ডেট রিকোয়েস্ট",
      `${user.name || 'মেম্বার'} একটি নতুন বাজার শিডিউল ডেট রিকোয়েস্ট করেছেন।`,
      undefined,
      user.messId.toString()
    );

    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function assignBazaarSchedule(userId: string, fromDate: Date, toDate: Date, managerUserId: string) {
  try {
    await connectToDatabase();
    const manager = await User.findById(managerUserId).lean();
    if (!manager || !manager.messId) return { success: false, error: "Mess not found" };

    const activeMonth = await Month.findOne({ isActive: true, messId: manager.messId }).lean();
    if (!activeMonth) return { success: false, error: "No active month" };

    const schedule = new BazaarSchedule({
      monthId: activeMonth._id,
      userId,
      fromDate,
      toDate,
      status: 'Approved'
    });
    await schedule.save();

    const user = await User.findById(userId).lean();
    await createNotification(
      "বাজারের শিডিউল দায়িত্ব",
      `${user?.name || 'মেম্বার'}-কে একটি নতুন বাজার শিডিউল দায়িত্ব দেওয়া হয়েছে।`,
      userId,
      manager.messId.toString()
    );

    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function updateBazaarScheduleStatus(id: string, status: 'Approved' | 'Pending' | 'Completed') {
  try {
    await connectToDatabase();
    const schedule = await BazaarSchedule.findByIdAndUpdate(id, { status }).populate('userId', 'name messId');
    if (!schedule) return { success: false, error: "Schedule not found" };

    const user = schedule.userId as any;
    let statusBengali = status === 'Approved' ? 'অনুমোদিত' : status === 'Completed' ? 'সম্পন্ন' : 'পেন্ডিং';
    
    await createNotification(
      "বাজারের দায়িত্ব আপডেট",
      `${user?.name || 'মেম্বার'} এর বাজার দায়িত্ব স্ট্যাটাস '${statusBengali}' করা হয়েছে।`,
      user?._id?.toString(),
      user?.messId?.toString()
    );
    
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function deleteBazaarSchedule(id: string) {
  try {
    await connectToDatabase();
    await BazaarSchedule.findByIdAndDelete(id);
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function getBazaarChecklist(userId: string) {
  try {
    await connectToDatabase();
    const user = await User.findById(userId).lean();
    if (!user || !user.messId) return { success: false, error: "Mess not found" };

    const items = await BazaarChecklist.find({ messId: user.messId }).sort({ createdAt: 1 }).lean();
    return { success: true, items: JSON.parse(JSON.stringify(items)) };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function addBazaarChecklistItem(adminUserId: string, item: string) {
  try {
    await connectToDatabase();

    const admin = await User.findById(adminUserId).lean();
    if (!admin || (admin.role !== 'Super Admin' && admin.role !== 'Manager') || !admin.messId) {
      return { success: false, error: 'Unauthorized.' };
    }

    const newItem = await BazaarChecklist.create({
      item,
      isCompleted: false,
      messId: admin.messId
    });
    return { success: true, item: JSON.parse(JSON.stringify(newItem)) };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function toggleBazaarChecklistItem(id: string, isCompleted: boolean) {
  try {
    await connectToDatabase();
    const updated = await BazaarChecklist.findByIdAndUpdate(id, { isCompleted }, { new: true }).lean();
    return { success: true, item: JSON.parse(JSON.stringify(updated)) };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function deleteBazaarChecklistItem(adminUserId: string, id: string) {
  try {
    await connectToDatabase();

    const admin = await User.findById(adminUserId).lean();
    if (!admin || (admin.role !== 'Super Admin' && admin.role !== 'Manager')) {
      return { success: false, error: 'Unauthorized.' };
    }

    await BazaarChecklist.findByIdAndDelete(id);
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}
