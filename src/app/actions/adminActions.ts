"use server";

import connectToDatabase from "@/lib/mongoose";
import Meal from "@/models/Meal";
import Expense from "@/models/Expense";
import Deposit from "@/models/Deposit";
import Month from "@/models/Month";
import Notification from "@/models/Notification";
import User from "@/models/User";
import Contact from "@/models/Contact";
import BazaarSchedule from "@/models/BazaarSchedule";
import BazaarChecklist from "@/models/BazaarChecklist";
import ChatMessage from "@/models/ChatMessage";
import MealRequest from "@/models/MealRequest";
import Mess from "@/models/Mess";
import SubscriptionRequest from "@/models/SubscriptionRequest";
import mongoose from "mongoose";

export async function wipeDatabase(confirmationCode: string, adminUserId: string) {
  try {
    if (confirmationCode !== 'DELETE MESS') {
      return { success: false, error: 'ভুল কনফার্মেশন কোড!' };
    }
    
    await connectToDatabase();
    const admin = await User.findById(adminUserId);
    if (!admin || admin.role !== 'Manager' || !admin.messId) {
      return { success: false, error: 'Unauthorized.' };
    }

    const messId = admin.messId;
    const months = await Month.find({ messId }).select('_id').lean();
    const monthIds = months.map(m => m._id);

    await Promise.all([
      Meal.deleteMany({ monthId: { $in: monthIds } }),
      Expense.deleteMany({ monthId: { $in: monthIds } }),
      Deposit.deleteMany({ monthId: { $in: monthIds } }),
      Month.deleteMany({ messId }),
      Notification.deleteMany({ messId }),
      BazaarSchedule.deleteMany({ monthId: { $in: monthIds } }),
      BazaarChecklist.deleteMany({ messId }),
      ChatMessage.deleteMany({ messId }),
      User.deleteMany({ messId, role: { $ne: 'Super Admin' } }),
      User.updateMany({ messId, role: 'Super Admin' }, {
        totalMeal: 0,
        deposit: 0,
        totalCost: 0,
        mealCost: 0,
        singleCost: 0,
        jointCost: 0,
        balance: 0
      })
    ]);

    return { success: true };
  } catch (error: any) {
    console.error("Error wiping database:", error);
    return { success: false, error: error.message };
  }
}

export async function getAllMonths(userId: string) {
  try {
    await connectToDatabase();
    const user = await User.findById(userId).lean();
    if (!user || !user.messId) return { success: true, months: [] };

    const months = await Month.find({ messId: user.messId }).sort({ createdAt: -1 }).lean();
    return { success: true, months: JSON.parse(JSON.stringify(months)) };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function setActiveMonth(monthId: string, adminUserId: string) {
  try {
    await connectToDatabase();
    const admin = await User.findById(adminUserId).lean();
    if (!admin || (admin.role !== 'Super Admin' && admin.role !== 'Manager') || !admin.messId) {
      return { success: false, error: 'Unauthorized.' };
    }

    await Month.updateMany({ messId: admin.messId }, { isActive: false });
    await Month.findOneAndUpdate({ _id: monthId, messId: admin.messId }, { isActive: true });
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function getDatabaseStats() {
  try {
    await connectToDatabase();
    
    // Perform lightweight document counting instead of heavy file-level db.stats() scanning
    const [messes, users, meals, expenses, deposits, months] = await Promise.all([
      Mess.countDocuments(),
      User.countDocuments(),
      Meal.countDocuments(),
      Expense.countDocuments(),
      Deposit.countDocuments(),
      Month.countDocuments()
    ]);

    const totalLimitBytes = 512 * 1024 * 1024;
    const objectsCount = messes + users + meals + expenses + deposits + months;
    
    // Estimate logical database sizes (average MongoDB document overhead is 1.5 KB)
    const dataSizeBytes = objectsCount * 1.5 * 1024;
    const storageSizeBytes = dataSizeBytes * 1.25; // Estimate compression/overhead
    const indexSizeBytes = objectsCount * 0.5 * 1024; // Estimate indexes size
    const totalUsedBytes = storageSizeBytes + indexSizeBytes;
    
    const percentUsed = (totalUsedBytes / totalLimitBytes) * 100;
    const freeSpaceBytes = Math.max(totalLimitBytes - totalUsedBytes, 0);
 
    return {
      success: true,
      stats: {
        dbName: "mess-manager",
        collectionsCount: 6,
        objectsCount,
        avgObjSizeBytes: 1536,
        dataSizeBytes,
        storageSizeBytes,
        indexSizeBytes,
        totalUsedBytes,
        totalLimitBytes,
        percentUsed: Math.min(percentUsed, 100).toFixed(2),
        freeSpaceBytes
      }
    };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function getContacts(userId: string) {
  try {
    await connectToDatabase();
    const user = await User.findById(userId).lean();
    if (!user || !user.messId) return { success: true, contacts: [] };

    let contacts = await Contact.find({ messId: user.messId }).sort({ createdAt: 1 }).lean();
    
    if (contacts.length === 0) {
      const defaultContacts = [
        { designation: "মেস ম্যানেজার", name: user.name, phone: "+8801700000000", messId: user.messId },
        { designation: "সহকারী ম্যানেজার", name: "MD Rifat", phone: "+8801900000000", messId: user.messId },
        { designation: "মেস বাবুর্চি (Cook)", name: "Babul Bhai", phone: "+8801800000000", messId: user.messId }
      ];
      await Contact.create(defaultContacts);
      contacts = await Contact.find({ messId: user.messId }).sort({ createdAt: 1 }).lean();
    }
    
    return { success: true, contacts: JSON.parse(JSON.stringify(contacts)) };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function saveContact(requesterId: string, contactData: { _id?: string; designation: string; name: string; phone: string }) {
  try {
    await connectToDatabase();
    
    const requester = await User.findById(requesterId).lean();
    if (!requester || (requester.role !== 'Super Admin' && requester.role !== 'Manager') || !requester.messId) {
      return { success: false, error: 'অনুমতি নেই!' };
    }
    
    if (contactData._id) {
      const updated = await Contact.findOneAndUpdate(
        { _id: contactData._id, messId: requester.messId },
        {
          designation: contactData.designation,
          name: contactData.name,
          phone: contactData.phone
        },
        { new: true }
      ).lean();
      return { success: true, contact: JSON.parse(JSON.stringify(updated)) };
    } else {
      const created = await Contact.create({
        designation: contactData.designation,
        name: contactData.name,
        phone: contactData.phone,
        messId: requester.messId
      });
      return { success: true, contact: JSON.parse(JSON.stringify(created)) };
    }
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function deleteContact(requesterId: string, contactId: string) {
  try {
    await connectToDatabase();
    
    const requester = await User.findById(requesterId).lean();
    if (!requester || (requester.role !== 'Super Admin' && requester.role !== 'Manager') || !requester.messId) {
      return { success: false, error: 'অনুমতি নেই!' };
    }
    
    await Contact.findOneAndDelete({ _id: contactId, messId: requester.messId });
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function updateUserPermissions(
  requesterId: string,
  targetUserId: string,
  permissions: {
    canManageMeals: boolean;
    canManageExpenses: boolean;
    canManageDeposits: boolean;
    canManageNotices: boolean;
    canManageBazaar: boolean;
  }
) {
  try {
    await connectToDatabase();
    
    const requester = await User.findById(requesterId).lean();
    if (!requester || (requester.role !== 'Super Admin' && requester.role !== 'Manager')) {
      return { success: false, error: 'অনুমতি নেই!' };
    }
    
    const updated = await User.findByIdAndUpdate(
      targetUserId,
      { permissions },
      { new: true }
    ).lean();
    
    return { success: true, user: JSON.parse(JSON.stringify(updated)) };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function broadcastSystemAnnouncement(adminUserId: string, title: string, message: string, targetMessId?: string) {
  try {
    await connectToDatabase();
    const admin = await User.findById(adminUserId).lean();
    if (!admin || admin.role !== 'Super Admin') {
      return { success: false, error: 'অনুমতি নেই (Super Admin Required)' };
    }

    const { createNotification } = await import('./notificationActions');

    if (targetMessId && targetMessId !== 'ALL') {
      await createNotification(`[সিস্টেম নোটিশ] ${title}`, message, undefined, targetMessId);
    } else {
      const allMesses = await Mess.find().select('_id').lean();
      await Promise.all(
        allMesses.map(m => createNotification(`[সিস্টেম নোটিশ] ${title}`, message, undefined, m._id.toString()))
      );
    }

    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function updateMessStatus(adminUserId: string, messId: string, status: 'Active' | 'Suspended') {
  try {
    await connectToDatabase();
    const admin = await User.findById(adminUserId).lean();
    if (!admin || admin.role !== 'Super Admin') {
      return { success: false, error: 'অনুমতি নেই (Super Admin Required)' };
    }

    const updated = await Mess.findByIdAndUpdate(messId, { status }, { new: true }).lean();
    return { success: true, mess: JSON.parse(JSON.stringify(updated)) };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function updateUserRoleAndPermissions(
  adminUserId: string,
  targetUserId: string,
  role: 'Super Admin' | 'Manager' | 'Member' | 'Pending',
  permissions?: any
) {
  try {
    await connectToDatabase();
    const admin = await User.findById(adminUserId).lean();
    if (!admin || admin.role !== 'Super Admin') {
      return { success: false, error: 'অনুমতি নেই (Super Admin Required)' };
    }

    const updateData: any = { role };
    if (permissions) {
      updateData.permissions = permissions;
    }

    const updated = await User.findByIdAndUpdate(targetUserId, updateData, { new: true }).lean();
    return { success: true, user: JSON.parse(JSON.stringify(updated)) };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function getSuperAdminDashboardData(adminUserId: string) {
  try {
    await connectToDatabase();
    
    // Auth check
    const admin = await User.findById(adminUserId).lean();
    if (!admin || admin.role !== 'Super Admin') {
      return { success: false, error: 'Unauthorized.' };
    }

    const [messesCount, usersCount, messes, users, dbStatsRes, totalMealsRes, totalDepositsRes, totalExpensesRes, subRequests] = await Promise.all([
      Mess.countDocuments(),
      User.countDocuments(),
      Mess.find().populate('creatorId', 'name email').sort({ createdAt: -1 }).lean(),
      User.find().populate('messId', 'name').sort({ createdAt: -1 }).lean(),
      getDatabaseStats(),
      Meal.aggregate([{ $group: { _id: null, sum: { $sum: '$mealCount' } } }]),
      Deposit.aggregate([{ $group: { _id: null, sum: { $sum: '$amount' } } }]),
      Expense.aggregate([{ $group: { _id: null, sum: { $sum: '$amount' } } }]),
      SubscriptionRequest.find()
        .populate('messId', 'name code status subscriptionStatus subscriptionExpiresAt')
        .populate('userId', 'name email role')
        .sort({ createdAt: -1 })
        .lean()
    ]);

    const systemTotalMeals = totalMealsRes[0]?.sum || 0;
    const systemTotalDeposits = totalDepositsRes[0]?.sum || 0;
    const systemTotalExpenses = totalExpensesRes[0]?.sum || 0;
    
    // Group user counts by messId
    const userCounts = await User.aggregate([
      { $group: { _id: '$messId', count: { $sum: 1 } } }
    ]);
    const userCountMap: Record<string, number> = {};
    userCounts.forEach((uc: any) => {
      if (uc._id) {
        userCountMap[uc._id.toString()] = uc.count;
      }
    });

    const populatedMesses = messes.map((m: any) => ({
      ...m,
      status: m.status || 'Active',
      memberCount: userCountMap[m._id.toString()] || 0
    }));

    return {
      success: true,
      messesCount,
      usersCount,
      systemTotals: {
        totalMeals: systemTotalMeals,
        totalDeposits: systemTotalDeposits,
        totalExpenses: systemTotalExpenses
      },
      messes: JSON.parse(JSON.stringify(populatedMesses)),
      users: JSON.parse(JSON.stringify(users)),
      subscriptionRequests: JSON.parse(JSON.stringify(subRequests)),
      dbStats: dbStatsRes.success ? dbStatsRes.stats : null
    };
  } catch (error: any) {
    console.error("Error fetching super admin dashboard data:", error);
    return { success: false, error: error.message };
  }
}
