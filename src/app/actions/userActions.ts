"use server";

import connectToDatabase from "@/lib/mongoose";
import User from "@/models/User";

export async function updateUserRole(userId: string, newRole: string) {
  try {
    await connectToDatabase();
    const user = await User.findByIdAndUpdate(userId, { role: newRole }, { new: true });
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

export async function changeManager(newManagerId: string) {
  try {
    await connectToDatabase();
    
    // Demote current managers to Member
    await User.updateMany({ role: 'Manager' }, { role: 'Member' });
    
    // Promote the selected user to Manager
    const user = await User.findByIdAndUpdate(newManagerId, { role: 'Manager' }, { new: true });
    
    return { success: true, user: JSON.parse(JSON.stringify(user)) };
  } catch (error: any) {
    console.error("Error changing manager:", error);
    return { success: false, error: error.message };
  }
}
