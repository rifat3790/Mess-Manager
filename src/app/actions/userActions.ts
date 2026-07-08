"use server";

import connectToDatabase from "@/lib/mongoose";
import User from "@/models/User";

export async function updateUserRole(userId: string, newRole: string, adminUserId: string) {
  try {
    await connectToDatabase();
    
    const admin = await User.findById(adminUserId).lean();
    if (!admin || (admin.role !== 'Super Admin' && admin.role !== 'Manager') || !admin.messId) {
      return { success: false, error: 'Unauthorized.' };
    }

    const targetUser = await User.findById(userId).lean();
    if (!targetUser || targetUser.messId?.toString() !== admin.messId.toString()) {
      return { success: false, error: 'User is not part of this Mess.' };
    }

    const user = await User.findByIdAndUpdate(userId, { role: newRole }, { new: true }).lean();
    return { success: true, user: JSON.parse(JSON.stringify(user)) };
  } catch (error: any) {
    console.error("Error updating user role:", error);
    return { success: false, error: error.message };
  }
}

export async function deleteUser(userId: string) {
  try {
    await connectToDatabase();
    await User.findByIdAndDelete(userId);
    return { success: true };
  } catch (error: any) {
    console.error("Error deleting user:", error);
    return { success: false, error: error.message };
  }
}

export async function changeManager(newManagerId: string, adminUserId: string) {
  try {
    await connectToDatabase();
    
    const admin = await User.findById(adminUserId).lean();
    if (!admin || (admin.role !== 'Super Admin' && admin.role !== 'Manager') || !admin.messId) {
      return { success: false, error: 'Unauthorized.' };
    }

    const newManager = await User.findById(newManagerId).lean();
    if (!newManager || newManager.messId?.toString() !== admin.messId.toString()) {
      return { success: false, error: 'User is not part of this Mess.' };
    }
    
    // Demote current managers in this mess to Member
    await User.updateMany({ messId: admin.messId, role: 'Manager' }, { role: 'Member' });
    
    // Promote the selected user to Manager
    const user = await User.findByIdAndUpdate(newManagerId, { role: 'Manager' }, { new: true }).lean();
    
    return { success: true, user: JSON.parse(JSON.stringify(user)) };
  } catch (error: any) {
    console.error("Error changing manager:", error);
    return { success: false, error: error.message };
  }
}

export async function rejectJoinRequest(userId: string, adminUserId: string) {
  try {
    await connectToDatabase();
    
    const admin = await User.findById(adminUserId).lean();
    if (!admin || (admin.role !== 'Super Admin' && admin.role !== 'Manager') || !admin.messId) {
      return { success: false, error: 'Unauthorized.' };
    }

    const targetUser = await User.findById(userId).lean();
    if (!targetUser || targetUser.messId?.toString() !== admin.messId.toString()) {
      return { success: false, error: 'User is not part of this Mess.' };
    }

    const user = await User.findByIdAndUpdate(userId, { 
      $unset: { messId: "" }, 
      role: 'Pending' 
    }, { new: true }).lean();

    return { success: true, user: JSON.parse(JSON.stringify(user)) };
  } catch (error: any) {
    console.error("Error rejecting join request:", error);
    return { success: false, error: error.message };
  }
}
