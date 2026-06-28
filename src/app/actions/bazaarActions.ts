"use server";

import connectToDatabase from "@/lib/mongoose";
import BazaarSchedule from "@/models/BazaarSchedule";
import Month from "@/models/Month";
import User from "@/models/User";

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
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function updateBazaarScheduleStatus(id: string, status: 'Approved' | 'Pending' | 'Completed') {
  try {
    await connectToDatabase();
    await BazaarSchedule.findByIdAndUpdate(id, { status });
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
