"use server";

import connectToDatabase from "@/lib/mongoose";
import SubscriptionRequest from "@/models/SubscriptionRequest";
import Mess from "@/models/Mess";
import User from "@/models/User";
import { createNotification } from "./notificationActions";
import { revalidatePath } from "next/cache";

export async function submitSubscriptionRequest(
  userId: string | any,
  messId: string | any,
  paymentMethod: 'bKash' | 'Nagad' | 'Rocket',
  senderPhone: string,
  trxId: string,
  amount: number,
  months: number
) {
  try {
    await connectToDatabase();

    // Register models
    if (!Mess) {}
    if (!User) {}

    const resolvedUserId = typeof userId === 'object' && userId?._id ? userId._id.toString() : userId?.toString();
    const resolvedMessId = typeof messId === 'object' && messId?._id ? messId._id.toString() : messId?.toString();

    if (!resolvedUserId || !resolvedMessId) {
      return { success: false, error: "ইউজার অথবা মেস আইডি পাওয়া যায়নি।" };
    }

    if (!senderPhone || !trxId || !amount || !months) {
      return { success: false, error: "সকল প্রয়োজনীয় তথ্য পূরণ করুন।" };
    }

    const cleanTrxId = trxId.trim().toUpperCase();
    const cleanPhone = senderPhone.trim();

    // Check if user or mess already has ANY pending subscription request
    const existingPending = await SubscriptionRequest.findOne({
      $or: [
        { messId: resolvedMessId, status: 'Pending' },
        { userId: resolvedUserId, status: 'Pending' }
      ]
    });

    if (existingPending) {
      return {
        success: false,
        error: `⚠️ আপনার ইতোমধ্যে একটি পেমেন্ট রিকোয়েস্ট (TrxID: ${existingPending.trxId}) পেন্ডিং রয়েছে! সুপার অ্যাডমিন সেটি অনুমোদন বা বাতিল না করা পর্যন্ত আবার আবেদন করা যাবে না।`
      };
    }

    const request = await SubscriptionRequest.create({
      messId: resolvedMessId,
      userId: resolvedUserId,
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

export async function getSubscriptionRequests(adminUserId: string | any) {
  try {
    await connectToDatabase();
    
    if (!Mess) {}
    if (!User) {}

    const resolvedAdminId = typeof adminUserId === 'object' && adminUserId?._id ? adminUserId._id.toString() : adminUserId?.toString();
    const admin = await User.findById(resolvedAdminId).lean();
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

export async function sendSubscriptionMessage(
  userId: string | any,
  requestId: string,
  text: string
) {
  try {
    await connectToDatabase();

    const resolvedUserId = typeof userId === 'object' && userId?._id ? userId._id.toString() : userId?.toString();
    const user = await User.findById(resolvedUserId).lean();
    if (!user) return { success: false, error: 'ইউজার পাওয়া যায়নি।' };

    const reqDoc = await SubscriptionRequest.findById(requestId);
    if (!reqDoc) return { success: false, error: 'পেমেন্ট রিকোয়েস্ট পাওয়া যায়নি।' };

    const senderRole: 'Super Admin' | 'User' = user.role === 'Super Admin' ? 'Super Admin' : 'User';
    const messageObj = {
      senderRole,
      senderName: user.name,
      text: text.trim(),
      createdAt: new Date()
    };

    if (!reqDoc.messages) {
      reqDoc.messages = [];
    }
    reqDoc.messages.push(messageObj as any);
    await reqDoc.save();

    // Send push notification to recipient
    if (senderRole === 'Super Admin') {
      await createNotification(
        "💬 সাবস্ক্রিপশন পেমেন্ট বার্তা (Super Admin)",
        `সুপার অ্যাডমিন বার্তা পাঠিয়েছেন: "${text.trim()}"`,
        reqDoc.userId.toString()
      );
    } else {
      const superAdmins = await User.find({ role: 'Super Admin' }).select('_id');
      for (const sa of superAdmins) {
        await createNotification(
          "💬 সাবস্ক্রিপশন উত্তর বার্তা",
          `মেস ব্যবহারকারী (${user.name}) বার্তা পাঠিয়েছেন: "${text.trim()}"`,
          sa._id.toString()
        );
      }
    }

    revalidatePath('/', 'layout');
    revalidatePath('/subscription');
    return { success: true, request: JSON.parse(JSON.stringify(reqDoc)) };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function getMessSubscriptionDetails(messId: string | any) {
  try {
    await connectToDatabase();

    const resolvedMessId = typeof messId === 'object' && messId?._id ? messId._id.toString() : messId?.toString();
    const mess = await Mess.findById(resolvedMessId).lean();
    if (!mess) return { success: false, error: 'মেস পাওয়া যায়নি' };

    const pendingRequest = await SubscriptionRequest.findOne({
      messId: resolvedMessId,
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

export async function grantMessSubscription(
  adminUserId: string | any,
  messId: string | any,
  months: number
) {
  try {
    await connectToDatabase();

    const resolvedAdminId = typeof adminUserId === 'object' && adminUserId?._id ? adminUserId._id.toString() : adminUserId?.toString();
    const admin = await User.findById(resolvedAdminId).lean();
    if (!admin || admin.role !== 'Super Admin') {
      return { success: false, error: 'অনুমতি নেই (Super Admin Required)' };
    }

    const resolvedMessId = typeof messId === 'object' && messId?._id ? messId._id.toString() : messId?.toString();
    const mess = await Mess.findById(resolvedMessId);
    if (!mess) {
      return { success: false, error: 'মেস পাওয়া যায়নি।' };
    }

    const now = new Date();
    let startDate = now;
    if (mess.subscriptionExpiresAt && new Date(mess.subscriptionExpiresAt) > now) {
      startDate = new Date(mess.subscriptionExpiresAt);
    }

    const daysToAdd = months * 31;
    const expiresAt = new Date(startDate.getTime() + daysToAdd * 24 * 60 * 60 * 1000);

    mess.subscriptionStatus = 'Active';
    mess.subscriptionExpiresAt = expiresAt;
    mess.subscriptionPlanMonths = months;
    await mess.save();

    const formattedExpiry = expiresAt.toLocaleDateString('bn-BD', { day: 'numeric', month: 'long', year: 'numeric' });
    await createNotification(
      "👑 মেস সাবস্ক্রিপশন সচল করা হয়েছে!",
      `সুপার অ্যাডমিন কর্তৃক আপনার মেসে ${months} মাসের প্রিমিয়াম সাবস্ক্রিপশন সচল করা হয়েছে! মেয়াদ শেষ হবে: ${formattedExpiry}।`,
      undefined,
      resolvedMessId
    );

    revalidatePath('/', 'layout');
    revalidatePath('/subscription');
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}
