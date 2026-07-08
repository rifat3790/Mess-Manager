"use server";

import connectToDatabase from "@/lib/mongoose";
import Month from "@/models/Month";
import User from "@/models/User";
import Meal from "@/models/Meal";
import Expense from "@/models/Expense";
import Deposit from "@/models/Deposit";
import MealRequest from "@/models/MealRequest";
import BazaarSchedule from "@/models/BazaarSchedule";
import Notification from "@/models/Notification";
import mongoose from "mongoose";

export async function createNewMonthSheet(monthName: string, startDate: Date, carryOverBalance: boolean = false, adminUserId: string) {
  try {
    await connectToDatabase();

    const admin = await User.findById(adminUserId).lean();
    if (!admin || (admin.role !== 'Super Admin' && admin.role !== 'Manager') || !admin.messId) {
      return { success: false, error: 'Unauthorized.' };
    }
    const messId = admin.messId;

    // 1. Calculate balances from previous active month if requested
    const carryOverList: { userId: string; balance: number; userName: string }[] = [];
    if (carryOverBalance) {
      const prevActiveMonth = await Month.findOne({ isActive: true, messId }).sort({ createdAt: -1 }).lean();
      if (prevActiveMonth) {
        const users = await User.find({ role: { $ne: 'Pending' }, messId }).lean();
        const meals = await Meal.find({ monthId: prevActiveMonth._id }).lean();
        const expenses = await Expense.find({ monthId: prevActiveMonth._id }).lean();
        const deposits = await Deposit.find({ monthId: prevActiveMonth._id }).lean();

        const totalMeals = meals.reduce((sum: number, m: any) => sum + m.mealCount, 0);
        const mealExpenses = expenses.filter((e: any) => e.type === 'Meal').reduce((sum: number, e: any) => sum + e.amount, 0);
        const mealRate = totalMeals > 0 ? mealExpenses / totalMeals : 0;
        const numUsers = users.length;

        // Group meals by user
        const userMealMap: Record<string, number> = {};
        for (const m of meals) {
          const uid = m.userId?.toString();
          if (uid) userMealMap[uid] = (userMealMap[uid] || 0) + m.mealCount;
        }

        // Group deposits by user
        const userDepositMap: Record<string, number> = {};
        for (const d of deposits) {
          const uid = d.userId?.toString();
          if (uid) userDepositMap[uid] = (userDepositMap[uid] || 0) + d.amount;
        }

        // Group single expenses by user
        const userSingleExpenseMap: Record<string, number> = {};
        for (const e of expenses) {
          if (e.type === 'Single') {
            const uid = e.userId?.toString();
            if (uid) userSingleExpenseMap[uid] = (userSingleExpenseMap[uid] || 0) + e.amount;
          }
        }

        // Group joint expenses by user
        const userJointCostMap: Record<string, number> = {};
        for (const e of expenses) {
          if (e.type === 'Joint') {
            const hasSharedBetween = e.sharedBetween && e.sharedBetween.length > 0;
            const shareCount = hasSharedBetween ? e.sharedBetween.length : numUsers;
            const shareAmount = e.amount / shareCount;

            if (hasSharedBetween) {
              for (const id of e.sharedBetween) {
                const uid = id?.toString();
                if (uid) userJointCostMap[uid] = (userJointCostMap[uid] || 0) + shareAmount;
              }
            } else {
              for (const u of users) {
                const uid = u._id.toString();
                userJointCostMap[uid] = (userJointCostMap[uid] || 0) + shareAmount;
              }
            }
          }
        }

        for (const user of users) {
          const uid = user._id.toString();
          const userMeals = userMealMap[uid] || 0;
          const userDeposit = userDepositMap[uid] || 0;
          const userSingleExpense = userSingleExpenseMap[uid] || 0;
          const userJointCost = userJointCostMap[uid] || 0;

          const mealCost = userMeals * mealRate;
          const totalCost = mealCost + userJointCost + userSingleExpense;
          const userBalance = userDeposit - totalCost;

          if (userBalance !== 0) {
            carryOverList.push({
              userId: uid,
              balance: parseFloat(userBalance.toFixed(2)),
              userName: user.name
            });
          }
        }
      }
    }

    // 2. Deactivate all months of this mess
    await Month.updateMany({ messId }, { isActive: false });

    // 3. Create the new month
    const newMonth = await Month.create({
      name: monthName,
      startDate: startDate,
      sheetTabName: monthName,
      isActive: true,
      messId
    });

    // 4. Carry over balances to the new month
    if (carryOverBalance && carryOverList.length > 0) {
      for (const item of carryOverList) {
        await Deposit.create({
          monthId: newMonth._id,
          userId: item.userId,
          amount: item.balance,
          date: new Date(startDate).setHours(0,0,0,0)
        });
      }
    }

    // 5. Automatic cleanup: keep only the latest 3 months' data to free up space
    const allMonths = await Month.find({ messId }).sort({ createdAt: -1 }).lean();
    if (allMonths.length > 3) {
      const monthsToDelete = allMonths.slice(3);
      const monthIdsToDelete = monthsToDelete.map(m => m._id);

      // Perform deletions of related data in bulk to clean the database storage
      await Promise.all([
        Month.deleteMany({ _id: { $in: monthIdsToDelete } }),
        Meal.deleteMany({ monthId: { $in: monthIdsToDelete } }),
        Expense.deleteMany({ monthId: { $in: monthIdsToDelete } }),
        Deposit.deleteMany({ monthId: { $in: monthIdsToDelete } }),
        MealRequest.deleteMany({ monthId: { $in: monthIdsToDelete } }),
        BazaarSchedule.deleteMany({ monthId: { $in: monthIdsToDelete } }),
        Notification.deleteMany({ messId, createdAt: { $lt: new Date(startDate) } })
      ]);
    } else {
      await Notification.deleteMany({ messId, createdAt: { $lt: new Date(startDate) } });
    }

    return { success: true, month: JSON.parse(JSON.stringify(newMonth)) };
  } catch (error: any) {
    console.error("Error creating new month:", error);
    return { success: false, error: error.message };
  }
}

// Dummy functions to satisfy existing imports without doing anything Google Sheets related
export async function syncDataToSheet(monthName: string, data: any) {
  return { success: true };
}

export async function updateDataInSheet(monthName: string, id: string, newData: any) {
  return { success: true };
}

export async function deleteDataFromSheet(monthName: string, id: string) {
  return { success: true };
}
