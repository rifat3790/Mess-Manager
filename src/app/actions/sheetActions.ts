"use server";

import connectToDatabase from "@/lib/mongoose";
import Month from "@/models/Month";
import User from "@/models/User";
import Meal from "@/models/Meal";
import Expense from "@/models/Expense";
import Deposit from "@/models/Deposit";
import MealRequest from "@/models/MealRequest";
import BazaarSchedule from "@/models/BazaarSchedule";

export async function createNewMonthSheet(monthName: string, startDate: Date, carryOverBalance: boolean = false) {
  try {
    await connectToDatabase();

    // 1. Calculate balances from previous active month if requested
    const carryOverList: { userId: string; balance: number; userName: string }[] = [];
    if (carryOverBalance) {
      const prevActiveMonth = await Month.findOne({ isActive: true }).sort({ createdAt: -1 });
      if (prevActiveMonth) {
        const users = await User.find({ role: { $ne: 'Pending' } });
        const meals = await Meal.find({ monthId: prevActiveMonth._id });
        const expenses = await Expense.find({ monthId: prevActiveMonth._id });
        const deposits = await Deposit.find({ monthId: prevActiveMonth._id });

        const totalMeals = meals.reduce((sum: number, m: any) => sum + m.mealCount, 0);
        const mealExpenses = expenses.filter((e: any) => e.type === 'Meal').reduce((sum: number, e: any) => sum + e.amount, 0);
        const mealRate = totalMeals > 0 ? mealExpenses / totalMeals : 0;
        const numUsers = users.length;

        for (const user of users) {
          const userMeals = meals.filter((m: any) => m.userId.toString() === user._id.toString()).reduce((sum: number, m: any) => sum + m.mealCount, 0);
          const userDeposit = deposits.filter((d: any) => d.userId.toString() === user._id.toString()).reduce((sum: number, d: any) => sum + d.amount, 0);
          const userSingleExpense = expenses.filter((e: any) => e.type === 'Single' && e.userId?.toString() === user._id.toString()).reduce((sum: number, e: any) => sum + e.amount, 0);

          const userJointExpenses = expenses.filter((e: any) => {
            if (e.type !== 'Joint') return false;
            if (!e.sharedBetween || e.sharedBetween.length === 0) return true;
            return e.sharedBetween.some((id: any) => id.toString() === user._id.toString());
          });

          const userJointCost = userJointExpenses.reduce((sum: number, e: any) => {
            const count = (!e.sharedBetween || e.sharedBetween.length === 0) ? numUsers : e.sharedBetween.length;
            return sum + (e.amount / count);
          }, 0);

          const mealCost = userMeals * mealRate;
          const totalCost = mealCost + userJointCost + userSingleExpense;
          const userBalance = userDeposit - totalCost;

          if (userBalance !== 0) {
            carryOverList.push({
              userId: user._id.toString(),
              balance: parseFloat(userBalance.toFixed(2)),
              userName: user.name
            });
          }
        }
      }
    }

    // 2. Deactivate all months
    await Month.updateMany({}, { isActive: false });

    // 3. Create the new month
    const newMonth = await Month.create({
      name: monthName,
      startDate: startDate,
      sheetTabName: monthName,
      isActive: true
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
    const allMonths = await Month.find().sort({ createdAt: -1 });
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
        BazaarSchedule.deleteMany({ monthId: { $in: monthIdsToDelete } })
      ]);
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
