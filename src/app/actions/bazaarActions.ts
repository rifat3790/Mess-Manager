"use server";

import connectToDatabase from "@/lib/mongoose";
import BazaarSchedule from "@/models/BazaarSchedule";
import Month from "@/models/Month";
import User from "@/models/User";
import { createNotification } from "./notificationActions";

export async function getBazaarSchedules() {
  try {
    await connectToDatabase();
    const activeMonth = await Month.findOne({ isActive: true });
    if (!activeMonth) return { success: false, error: "No active month" };

    const schedules = await BazaarSchedule.find({ monthId: activeMonth._id }).populate('userId', 'name email').sort({ fromDate: 1 });
    return { success: true, schedules: JSON.parse(JSON.stringify(schedules)) };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function requestBazaarSchedule(userId: string, fromDate: Date, toDate: Date) {
  try {
    await connectToDatabase();
    const activeMonth = await Month.findOne({ isActive: true });
    if (!activeMonth) return { success: false, error: "No active month" };

    const schedule = new BazaarSchedule({
      monthId: activeMonth._id,
      userId,
      fromDate,
      toDate,
      status: 'Pending'
    });
    await schedule.save();

    const user = await User.findById(userId);
    await createNotification("বাজারের ডেট রিকোয়েস্ট", `${user?.name || 'মেম্বার'} একটি নতুন বাজার শিডিউল ডেট রিকোয়েস্ট করেছেন।`);

    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function assignBazaarSchedule(userId: string, fromDate: Date, toDate: Date) {
  try {
    await connectToDatabase();
    const activeMonth = await Month.findOne({ isActive: true });
    if (!activeMonth) return { success: false, error: "No active month" };

    const schedule = new BazaarSchedule({
      monthId: activeMonth._id,
      userId,
      fromDate,
      toDate,
      status: 'Approved' // Manager assigns it directly, so it's approved
    });
    await schedule.save();

    const user = await User.findById(userId);
    await createNotification("বাজারের শিডিউল দায়িত্ব", `${user?.name || 'মেম্বার'}-কে একটি নতুন বাজার শিডিউল দায়িত্ব দেওয়া হয়েছে।`);

    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function updateBazaarScheduleStatus(id: string, status: 'Approved' | 'Pending' | 'Completed') {
  try {
    await connectToDatabase();
    const schedule = await BazaarSchedule.findByIdAndUpdate(id, { status }).populate('userId', 'name');
    
    let statusBengali = status === 'Approved' ? 'অনুমোদিত' : status === 'Completed' ? 'সম্পন্ন' : 'পেন্ডিং';
    await createNotification("বাজারের দায়িত্ব আপডেট", `${schedule?.userId?.name || 'মেম্বার'} এর বাজার দায়িত্ব স্ট্যাটাস '${statusBengali}' করা হয়েছে।`);
    
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
