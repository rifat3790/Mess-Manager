"use server";

import connectToDatabase from "@/lib/mongoose";
import Meal from "@/models/Meal";
import Expense from "@/models/Expense";
import Deposit from "@/models/Deposit";
import Month from "@/models/Month";
import Notification from "@/models/Notification";
import User from "@/models/User";
import Contact from "@/models/Contact";
import mongoose from "mongoose";

export async function wipeDatabase(confirmationCode: string) {
  try {
    if (confirmationCode !== 'DELETE MESS') {
      return { success: false, error: 'ভুল কনফার্মেশন কোড!' };
    }
    
    await connectToDatabase();
    
    // We will drop all collections except Settings
    await Meal.deleteMany({});
    await Expense.deleteMany({});
    await Deposit.deleteMany({});
    await Month.deleteMany({});
    await Notification.deleteMany({});
    
    // For users, maybe keep Super Admin but delete the rest, or just delete their stats?
    // The request was "delete mess", which implies resetting the entire mess data. Let's delete all members except Super Admin.
    await User.deleteMany({ role: { $ne: 'Super Admin' } });

    // Reset stats for Super Admin
    await User.updateMany({ role: 'Super Admin' }, {
      totalMeal: 0,
      deposit: 0,
      totalCost: 0,
      mealCost: 0,
      singleCost: 0,
      jointCost: 0,
      balance: 0
    });

    return { success: true };
  } catch (error: any) {
    console.error("Error wiping database:", error);
    return { success: false, error: error.message };
  }
}

export async function getAllMonths() {
  try {
    await connectToDatabase();
    const months = await Month.find().sort({ createdAt: -1 });
    return { success: true, months: JSON.parse(JSON.stringify(months)) };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function setActiveMonth(monthId: string) {
  try {
    await connectToDatabase();
    // Set all to inactive
    await Month.updateMany({}, { isActive: false });
    // Set the specific one to active
    await Month.findByIdAndUpdate(monthId, { isActive: true });
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
    
    const totalLimitBytes = 512 * 1024 * 1024; // 512 MB
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

export async function getContacts() {
  try {
    await connectToDatabase();
    let contacts = await Contact.find().sort({ createdAt: 1 });
    
    // Seed default contacts if empty
    if (contacts.length === 0) {
      const defaultContacts = [
        { designation: "মেস ম্যানেজার", name: "Md Refayet Hossen", phone: "+8801700000000" },
        { designation: "সহকারী ম্যানেজার", name: "MD Rifat", phone: "+8801900000000" },
        { designation: "মেস বাবুর্চি (Cook)", name: "Babul Bhai", phone: "+8801800000000" }
      ];
      await Contact.create(defaultContacts);
      contacts = await Contact.find().sort({ createdAt: 1 });
    }
    
    return { success: true, contacts: JSON.parse(JSON.stringify(contacts)) };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function saveContact(requesterId: string, contactData: { _id?: string; designation: string; name: string; phone: string }) {
  try {
    await connectToDatabase();
    
    // Authorization check
    const requester = await User.findById(requesterId);
    if (!requester || (requester.role !== 'Super Admin' && requester.role !== 'Manager')) {
      return { success: false, error: 'অনুমতি নেই!' };
    }
    
    if (contactData._id) {
      // Update existing
      const updated = await Contact.findByIdAndUpdate(contactData._id, {
        designation: contactData.designation,
        name: contactData.name,
        phone: contactData.phone
      }, { new: true });
      return { success: true, contact: JSON.parse(JSON.stringify(updated)) };
    } else {
      // Create new
      const created = await Contact.create({
        designation: contactData.designation,
        name: contactData.name,
        phone: contactData.phone
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
    
    // Authorization check
    const requester = await User.findById(requesterId);
    if (!requester || (requester.role !== 'Super Admin' && requester.role !== 'Manager')) {
      return { success: false, error: 'অনুমতি নেই!' };
    }
    
    await Contact.findByIdAndDelete(contactId);
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

