"use server";

import connectToDatabase from "@/lib/mongoose";
import SubscriptionRequest from "@/models/SubscriptionRequest";
import Mess from "@/models/Mess";
import User from "@/models/User";
import { createNotification } from "./notificationActions";
import { revalidatePath } from "next/cache";

export async function submitSubscriptionRequest(
  userId: string,
  messId: string,
  paymentMethod: 'bKash' | 'Nagad' | 'Rocket',
  senderPhone: string,
  trxId: string,
  amount: number,
  months: number
) {
  try {
    await connectToDatabase();

    if (!senderPhone || !trxId || !amount || !months) {
      return { success: false, error: "সকল প্রয়োজনীয় তথ্য পূরণ করুন।" };
    }

    const cleanTrxId = trxId.trim().toUpperCase();
    const cleanPhone = senderPhone.trim();

    // Check for duplicate pending transaction ID
    const existing = await SubscriptionRequest.findOne({
      trxId: cleanTrxId,
      status: 'Pending'
    });

    if (existing) {
      return { success: false, error: "এই ট্রানজেকশন আইডি (TrxID) দিয়ে ইতোমধ্যে একটি পেমেন্ট রিকোয়েস্ট পেন্ডিং আছে।" };
    }

    const request = await SubscriptionRequest.create({
      messId,
      userId,
      paymentMethod,
      senderPhone: cleanPhone,
      trxId: cleanTrxId,
      amount,
      months,
      status: 'Pending'
    });

    // Notify Super Admin
    const superAdmins = await User.find({ role: 'Super Admin' }).select('_id');
    for (const sa of superAdmins) {
      await createNotification(
        "💳 নতুন মেস সাবস্ক্রিপশন পেমেন্ট রিকোয়েস্ট",
        `নতুন পেমেন্ট: ৳${amount} (${months} মাস)। TrxID: ${cleanTrxId}, মেথড: ${paymentMethod} (${cleanPhone})।`,
        sa._id.toString()
      );
    }

    revalidatePath('/', 'layout');
    revalidatePath('/subscription');
    return { success: true, request: JSON.parse(JSON.stringify(request)) };
  } catch (error: any) {
    console.error("Error submitting subscription request:", error);
    return { success: false, error: error.message };
  }
}

export async function getSubscriptionRequests(adminUserId: string) {
  try {
    await connectToDatabase();
    
    const admin = await User.findById(adminUserId).lean();
    if (!admin || admin.role !== 'Super Admin') {
      return { success: false, error: 'অনুমতি নেই (Super Admin Required)' };
    }

    const requests = await SubscriptionRequest.find()
      .populate('messId', 'name code status subscriptionStatus subscriptionExpiresAt')
      .populate('userId', 'name email role')
      .sort({ createdAt: -1 })
      .lean();

    return { success: true, requests: JSON.parse(JSON.stringify(requests)) };
  } catch (error: any) {
    console.error("Error fetching subscription requests:", error);
    return { success: false, error: error.message };
  }
}

export async function approveSubscriptionRequest(
  adminUserId: string,
  requestId: string,
  monthsOverride?: number
) {
  try {
    await connectToDatabase();

    const admin = await User.findById(adminUserId).lean();
    if (!admin || admin.role !== 'Super Admin') {
      return { success: false, error: 'অনুমতি নেই (Super Admin Required)' };
    }

    const reqDoc = await SubscriptionRequest.findById(requestId);
    if (!reqDoc) {
      return { success: false, error: 'পেমেন্ট রিকোয়েস্ট পাওয়া যায়নি।' };
    }

    const monthsToApprove = monthsOverride && monthsOverride > 0 ? monthsOverride : reqDoc.months;
    const messId = reqDoc.messId;

    const mess = await Mess.findById(messId);
    if (!mess) {
      return { success: false, error: 'মেস পাওয়া যায়নি।' };
    }

    // Calculate subscription validity starting from now (or extending if currently active)
    const now = new Date();
    let startDate = now;
    if (mess.subscriptionExpiresAt && new Date(mess.subscriptionExpiresAt) > now) {
      startDate = new Date(mess.subscriptionExpiresAt);
    }

    // 1 Month = 31 Days calculation
    const daysToAdd = monthsToApprove * 31;
    const expiresAt = new Date(startDate.getTime() + daysToAdd * 24 * 60 * 60 * 1000);

    // Update Mess status
    mess.subscriptionStatus = 'Active';
    mess.subscriptionExpiresAt = expiresAt;
    mess.subscriptionPlanMonths = monthsToApprove;
    mess.lastPaymentTrxId = reqDoc.trxId;
    await mess.save();

    // Update Request status
    reqDoc.status = 'Approved';
    reqDoc.months = monthsToApprove;
    reqDoc.approvedAt = now;
    await reqDoc.save();

    // Notify Mess Manager and Members
    const formattedExpiry = expiresAt.toLocaleDateString('bn-BD', { day: 'numeric', month: 'long', year: 'numeric' });
    await createNotification(
      "🎉 প্রিমিয়াম সাবস্ক্রিপশন সচল হয়েছে!",
      `আপনার মেসের ${monthsToApprove} মাসের প্রিমিয়াম সাবস্ক্রিপশন সফলভাবে অনুমোদিত হয়েছে! মেম্বার শিপের মেয়াদ শেষ হবে: ${formattedExpiry}।`,
      undefined,
      messId.toString()
    );

    revalidatePath('/', 'layout');
    revalidatePath('/subscription');
    return { success: true };
  } catch (error: any) {
    console.error("Error approving subscription request:", error);
    return { success: false, error: error.message };
  }
}

export async function rejectSubscriptionRequest(
  adminUserId: string,
  requestId: string,
  adminNote?: string
) {
  try {
    await connectToDatabase();

    const admin = await User.findById(adminUserId).lean();
    if (!admin || admin.role !== 'Super Admin') {
      return { success: false, error: 'অনুমতি নেই (Super Admin Required)' };
    }

    const reqDoc = await SubscriptionRequest.findById(requestId);
    if (!reqDoc) {
      return { success: false, error: 'পেমেন্ট রিকোয়েস্ট পাওয়া যায়নি।' };
    }

    reqDoc.status = 'Rejected';
    reqDoc.adminNote = adminNote || 'পেমেন্ট ও TrxID সঠিক নয় অথবা যাচাই করা যায়নি।';
    await reqDoc.save();

    await createNotification(
      "❌ সাবস্ক্রিপশন পেমেন্ট রিকোয়েস্ট বাতিল",
      `আপনার মেসের সাবস্ক্রিপশন পেমেন্ট রিকোয়েস্টটি বাতিল করা হয়েছে। কারণ: ${reqDoc.adminNote}`,
      reqDoc.userId.toString()
    );

    revalidatePath('/', 'layout');
    revalidatePath('/subscription');
    return { success: true };
  } catch (error: any) {
    console.error("Error rejecting subscription request:", error);
    return { success: false, error: error.message };
  }
}

export async function getMessSubscriptionDetails(messId: string) {
  try {
    await connectToDatabase();

    const mess = await Mess.findById(messId).lean();
    if (!mess) return { success: false, error: 'মেস পাওয়া যায়নি' };

    const pendingRequest = await SubscriptionRequest.findOne({
      messId,
      status: 'Pending'
    }).sort({ createdAt: -1 }).lean();

    const now = new Date();
    const expiresAt = mess.subscriptionExpiresAt ? new Date(mess.subscriptionExpiresAt) : null;
    const isActive = mess.subscriptionStatus === 'Active' && expiresAt && expiresAt > now;

    let daysLeft = 0;
    if (expiresAt && expiresAt > now) {
      const diffMs = expiresAt.getTime() - now.getTime();
      daysLeft = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
    }

    return {
      success: true,
      subscription: {
        status: isActive ? 'Active' : (mess.subscriptionStatus === 'Expired' || expiresAt ? 'Expired' : 'None'),
        isActive,
        expiresAt: expiresAt ? expiresAt.toISOString() : null,
        daysLeft,
        planMonths: mess.subscriptionPlanMonths || 0,
        lastTrxId: mess.lastPaymentTrxId || null,
        pendingRequest: pendingRequest ? JSON.parse(JSON.stringify(pendingRequest)) : null
      }
    };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}
