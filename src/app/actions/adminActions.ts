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
import mongoose from "mongoose";

export async function wipeDatabase(confirmationCode: string, adminUserId: string) {
  try {
    if (confirmationCode !== 'DELETE MESS') {
      return { success: false, error: 'ভুল কনফার্মেশন কোড!' };
    }
    
    await connectToDatabase();
    const admin = await User.findById(adminUserId);
    if (!admin || admin.role !== 'Super Admin' || !admin.messId) {
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
    
    if (!mongoose.connection.db) {
      throw new Error("Database connection not ready");
    }
    
    const stats = await mongoose.connection.db.stats();
    
    const totalLimitBytes = 512 * 1024 * 1024;
    const storageSizeBytes = stats.storageSize || 0;
    const dataSizeBytes = stats.dataSize || 0;
    const indexSizeBytes = stats.indexSize || 0;
    const totalUsedBytes = storageSizeBytes + indexSizeBytes;
    
    const percentUsed = (totalUsedBytes / totalLimitBytes) * 100;
    const freeSpaceBytes = Math.max(totalLimitBytes - totalUsedBytes, 0);
 
    return {
      success: true,
      stats: {
        dbName: stats.db,
        collectionsCount: stats.collections,
        objectsCount: stats.objects,
        avgObjSizeBytes: stats.avgObjSize || 0,
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
