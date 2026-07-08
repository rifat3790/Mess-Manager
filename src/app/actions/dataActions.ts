"use server";

import connectToDatabase from "@/lib/mongoose";
import Meal from "@/models/Meal";
import Expense from "@/models/Expense";
import Deposit from "@/models/Deposit";
import Month from "@/models/Month";
import User from "@/models/User";
import Notification from "@/models/Notification";
import { syncDataToSheet, updateDataInSheet, deleteDataFromSheet } from "./sheetActions";
import { createNotification } from "./notificationActions";
import mongoose from "mongoose";
import MealRequest from "@/models/MealRequest";
import { revalidatePath } from "next/cache";
import Notice from "@/models/Notice";
import Menu from "@/models/Menu";
import MenuRating from "@/models/MenuRating";
import { getBazaarSchedules, getBazaarChecklist } from './bazaarActions';
import { getNotifications } from './notificationActions';
import { getContacts } from './adminActions';

export async function addMeal(monthId: string, userId: string, date: Date, mealCount: number) {
  try {
    await connectToDatabase();
    
    let meal = await Meal.findOne({ monthId, userId, date: new Date(date).setHours(0,0,0,0) });
    
    if (meal) {
      meal.mealCount += mealCount;
      await meal.save();
    } else {
      meal = await Meal.create({
        monthId,
        userId,
        date: new Date(date).setHours(0,0,0,0),
        mealCount
      });
    }

    const user = await User.findById(userId);
    const month = await Month.findById(monthId);

    if (month && user) {
      try {
        await syncDataToSheet(month.sheetTabName, {
          date: new Date(date).toLocaleDateString(),
          memberName: user.name,
          type: 'Meal',
          description: 'Daily Meal',
          amount: mealCount,
          time: new Date().toLocaleTimeString(),
          _id: meal._id.toString()
        });
      } catch (sheetErr) {
        console.error("Sheets sync error in addMeal:", sheetErr);
      }
    }

    // Calculate user's total meals in the month
    const userMeals = await Meal.find({ monthId, userId });
    const userTotalMeals = userMeals.reduce((sum, m) => sum + m.mealCount, 0);

    await createNotification("নতুন মিল যুক্ত হয়েছে", `আপনার অ্যাকাউন্টে নতুন মিল যুক্ত হয়েছে। যোগ করা হয়েছে: ${mealCount} টি। বর্তমান মোট মিল: ${userTotalMeals.toFixed(1)} টি।`, userId);

    revalidatePath('/', 'layout');
    return { success: true, meal: JSON.parse(JSON.stringify(meal)) };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function addExpense(monthId: string, userId: string | null, type: 'Meal' | 'Joint' | 'Single', amount: number, description: string, date: Date, sharedBetween?: string[]) {
  try {
    await connectToDatabase();
    
    // For Joint (shared) expenses: always snapshot exactly which members share this cost.
    // If no sharedBetween list is provided, it means "all current active members".
    // We snapshot them NOW so future new members don't inherit this old cost unfairly.
    let resolvedSharedBetween = sharedBetween;
    if (type === 'Joint') {
      if (!resolvedSharedBetween || resolvedSharedBetween.length === 0) {
        const allActiveUsers = await User.find({ role: { $ne: 'Pending' } }).select('_id');
        resolvedSharedBetween = allActiveUsers.map((u: any) => u._id.toString());
      }
    }

    const expense = await Expense.create({
      monthId,
      userId: userId || null,
      type,
      amount,
      description,
      date: new Date(date).setHours(0,0,0,0),
      sharedBetween: resolvedSharedBetween
    });

    const month = await Month.findById(monthId);
    let memberName = 'Mess Committee';
    if (userId) {
      const user = await User.findById(userId);
      if (user) memberName = user.name;
    }

    await syncDataToSheet(month.sheetTabName, {
      date: new Date(date).toLocaleDateString(),
      memberName,
      type: `Expense (${type})`,
      description,
      amount,
      time: new Date().toLocaleTimeString(),
      _id: expense._id.toString()
    });

    await createNotification("নতুন খরচ যুক্ত করা হয়েছে", `${memberName}-এর ${amount} টাকার একটি নতুন খরচ (${type}) যুক্ত করা হয়েছে।`, undefined, month.messId.toString());

    revalidatePath('/', 'layout');
    return { success: true, expense: JSON.parse(JSON.stringify(expense)) };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function addDeposit(monthId: string, userId: string, amount: number, date: Date) {
  try {
    await connectToDatabase();
    
    const deposit = await Deposit.create({
      monthId,
      userId,
      amount,
      date: new Date(date).setHours(0,0,0,0)
    });

    const user = await User.findById(userId);
    const month = await Month.findById(monthId);

    if (month && user) {
      try {
        await syncDataToSheet(month.sheetTabName, {
          date: new Date(date).toLocaleDateString(),
          memberName: user.name,
          type: 'Deposit',
          description: 'Money Deposited',
          amount,
          time: new Date().toLocaleTimeString(),
          _id: deposit._id.toString()
        });
      } catch (sheetErr) {
        console.error("Sheets sync error in addDeposit:", sheetErr);
      }
    }

    await createNotification("টাকা জমা হয়েছে", `আপনার অ্যাকাউন্টে ${amount} টাকা জমা করা হয়েছে।`, userId);

    revalidatePath('/', 'layout');
    return { success: true, deposit: JSON.parse(JSON.stringify(deposit)) };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function deleteMeal(id: string) {
  try {
    await connectToDatabase();
    const meal = await Meal.findById(id);
    if (!meal) return { success: false, error: "Not found" };
    const month = await Month.findById(meal.monthId);
    const user = await User.findById(meal.userId);
    await meal.deleteOne();
    if (month) {
      try {
        await deleteDataFromSheet(month.sheetTabName, id);
      } catch (sheetErr) {
        console.error("Sheets delete error in deleteMeal:", sheetErr);
      }
    }
    
    if (user && user.messId) await createNotification("মিল ডিলিট", `${user.name}-এর একটি মিল রেকর্ড ডিলিট করা হয়েছে।`, undefined, user.messId.toString());

    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function deleteExpense(id: string) {
  try {
    await connectToDatabase();
    const expense = await Expense.findById(id);
    if (!expense) return { success: false, error: "Not found" };
    const month = await Month.findById(expense.monthId);
    let memberName = 'Mess Committee';
    if (expense.userId) {
       const user = await User.findById(expense.userId);
       if (user) memberName = user.name;
    }
    await expense.deleteOne();
    if (month) {
      try {
        await deleteDataFromSheet(month.sheetTabName, id);
      } catch (sheetErr) {
        console.error("Sheets delete error in deleteExpense:", sheetErr);
      }
    }

    if (month) await createNotification("খরচ ডিলিট", `${memberName}-এর একটি খরচের রেকর্ড ডিলিট করা হয়েছে।`, undefined, month.messId.toString());

    revalidatePath('/', 'layout');
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function deleteDeposit(id: string) {
  try {
    await connectToDatabase();
    const deposit = await Deposit.findById(id);
    if (!deposit) return { success: false, error: "Not found" };
    const month = await Month.findById(deposit.monthId);
    const user = await User.findById(deposit.userId);
    await deposit.deleteOne();
    if (month) {
      try {
        await deleteDataFromSheet(month.sheetTabName, id);
      } catch (sheetErr) {
        console.error("Sheets delete error in deleteDeposit:", sheetErr);
      }
    }

    if (user && user.messId) await createNotification("জমা ডিলিট", `আপনার একটি টাকা জমার রেকর্ড ডিলিট করা হয়েছে।`, deposit.userId.toString(), user.messId.toString());

    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function updateMeal(id: string, mealCount: number) {
  try {
    await connectToDatabase();
    const meal = await Meal.findById(id);
    if (!meal) return { success: false, error: "Not found" };
    meal.mealCount = mealCount;
    await meal.save();
    
    const month = await Month.findById(meal.monthId);
    if (month) {
      await updateDataInSheet(month.sheetTabName, id, {
        type: 'Meal',
        amount: mealCount
      });
    }
    
    const user = await User.findById(meal.userId);
    if (user && user.messId) {
      await createNotification("মিল আপডেট", `${user.name}-এর মিল সংখ্যা আপডেট করে ${mealCount} টি করা হয়েছে।`, undefined, user.messId.toString());
    }
    
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function updateExpense(id: string, amount: number, description: string) {
  try {
    await connectToDatabase();
    const expense = await Expense.findById(id);
    if (!expense) return { success: false, error: "Not found" };
    expense.amount = amount;
    expense.description = description;
    await expense.save();
    
    const month = await Month.findById(expense.monthId);
    if (month) {
      await updateDataInSheet(month.sheetTabName, id, {
        type: expense.type === 'Joint' ? 'Shared Expense' : 'Expense',
        amount: amount,
        description: description
      });
    }

    let memberName = 'Mess Committee';
    if (expense.userId) {
       const user = await User.findById(expense.userId);
       if (user) memberName = user.name;
    }
    await createNotification("খরচ আপডেট", `${memberName}-এর একটি খরচের পরিমাণ আপডেট করে ${amount} টাকা করা হয়েছে।`);

    revalidatePath('/', 'layout');
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function updateDeposit(id: string, amount: number) {
  try {
    await connectToDatabase();
    const deposit = await Deposit.findById(id);
    if (!deposit) return { success: false, error: "Not found" };
    deposit.amount = amount;
    await deposit.save();
    const user = await User.findById(deposit.userId);
    const month = await Month.findById(deposit.monthId);
    if (month && user) {
      try {
        await updateDataInSheet(month.sheetTabName, id, {
          type: 'Deposit',
          amount: amount
        });
      } catch (sheetErr) {
        console.error("Sheets update error in updateDeposit:", sheetErr);
      }
    }

    if (user) {
      await createNotification("জমা আপডেট", `আপনার জমার পরিমাণ আপডেট করে ${amount} টাকা করা হয়েছে।`, deposit.userId.toString());
    }

    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function getActiveMonth(userId: string) {
  try {
    await connectToDatabase();
    const user = await User.findById(userId).lean();
    if (!user || !user.messId) return { success: false, error: "Mess not found." };

    const month = await Month.findOne({ isActive: true, messId: user.messId }).sort({ createdAt: -1 }).lean();
    if (!month) return { success: false, error: "No active month found" };
    return { success: true, month: JSON.parse(JSON.stringify(month)) };
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

export async function getMembers(userId: string) {
  try {
    await connectToDatabase();
    const user = await User.findById(userId).lean();
    if (!user || !user.messId) return { success: true, users: [] };

    const users = await User.find({
      messId: user.messId,
      role: { $in: ['Member', 'Manager', 'Super Admin', 'Pending'] }
    }).lean();

    return { success: true, users: JSON.parse(JSON.stringify(users)) };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function getDashboardData(userId: string) {
  try {
    await connectToDatabase();
    
    const user = await User.findById(userId).lean();
    if (!user || !user.messId) return { success: true, stats: null, members: [] };

    const activeMonth = await Month.findOne({ isActive: true, messId: user.messId }).sort({ createdAt: -1 }).lean();
    if (!activeMonth) return { success: true, stats: null, members: [] };

    const users = await User.find({ role: { $ne: 'Pending' }, messId: user.messId }).lean();

    const meals = await Meal.find({ monthId: activeMonth._id }).lean();
    const expenses = await Expense.find({ monthId: activeMonth._id }).lean();
    const deposits = await Deposit.find({ monthId: activeMonth._id }).lean();

    const totalMeals = meals.reduce((sum, meal) => sum + meal.mealCount, 0);
    const totalDeposit = deposits.reduce((sum, dep) => sum + dep.amount, 0);
    
    const mealExpenses = expenses.filter(e => e.type === 'Meal').reduce((sum, e) => sum + e.amount, 0);
    const jointExpenses = expenses.filter(e => e.type === 'Joint').reduce((sum, e) => sum + e.amount, 0);
    const singleExpenses = expenses.filter(e => e.type === 'Single').reduce((sum, e) => sum + e.amount, 0);
    
    const totalExpense = mealExpenses + jointExpenses + singleExpenses;
    const balance = totalDeposit - totalExpense;
    const mealRate = totalMeals > 0 ? mealExpenses / totalMeals : 0;

    const globalStats = {
      monthName: activeMonth.name,
      totalMeals,
      totalDeposit,
      totalExpense,
      balance,
      mealExpenses,
      mealRate,
      singleExpenses,
      jointExpenses
    };

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

    const memberStats = users.map(user => {
      const uid = user._id.toString();
      const userMeals = userMealMap[uid] || 0;
      const userDeposit = userDepositMap[uid] || 0;
      const userSingleExpense = userSingleExpenseMap[uid] || 0;
      const userJointCost = userJointCostMap[uid] || 0;

      const mealCost = userMeals * mealRate;
      const totalCost = mealCost + userJointCost + userSingleExpense;
      const userBalance = userDeposit - totalCost;

      return {
        _id: uid,
        name: user.name,
        role: user.role,
        totalMeal: userMeals,
        mealCost,
        singleCost: userSingleExpense,
        jointCost: userJointCost,
        totalCost,
        deposit: userDeposit,
        balance: userBalance,
        seed: user.name
      };
    });

    return { success: true, stats: globalStats, members: memberStats, expenses: JSON.parse(JSON.stringify(expenses)) };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function getAllMonthsReportData(userId: string) {
  try {
    await connectToDatabase();
    
    const user = await User.findById(userId).lean();
    if (!user || !user.messId) return { success: true, data: [] };

    const months = await Month.find({ messId: user.messId }).sort({ createdAt: -1 }).lean();
    const users = await User.find({ role: { $ne: 'Pending' }, messId: user.messId }).lean();
    
    const allData = [];
    
    for (const month of months) {
      const meals = await Meal.find({ monthId: month._id }).lean();
      const expenses = await Expense.find({ monthId: month._id }).lean();
      const deposits = await Deposit.find({ monthId: month._id }).lean();

      const totalMeals = meals.reduce((sum, meal) => sum + meal.mealCount, 0);
      const totalDeposit = deposits.reduce((sum, dep) => sum + dep.amount, 0);
      
      const mealExpenses = expenses.filter(e => e.type === 'Meal').reduce((sum, e) => sum + e.amount, 0);
      const jointExpenses = expenses.filter(e => e.type === 'Joint').reduce((sum, e) => sum + e.amount, 0);
      const singleExpenses = expenses.filter(e => e.type === 'Single').reduce((sum, e) => sum + e.amount, 0);
      
      const totalExpense = mealExpenses + jointExpenses + singleExpenses;
      const balance = totalDeposit - totalExpense;
      const mealRate = totalMeals > 0 ? mealExpenses / totalMeals : 0;

      const globalStats = {
        monthName: month.name,
        isActive: month.isActive,
        totalMeals,
        totalDeposit,
        totalExpense,
        balance,
        mealExpenses,
        mealRate
      };

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

      const memberStats = users.map(user => {
        const uid = user._id.toString();
        const userMeals = userMealMap[uid] || 0;
        const userDeposit = userDepositMap[uid] || 0;
        const userSingleExpense = userSingleExpenseMap[uid] || 0;
        const userJointCost = userJointCostMap[uid] || 0;

        const mealCost = userMeals * mealRate;
        const totalCost = mealCost + userJointCost + userSingleExpense;
        const userBalance = userDeposit - totalCost;

        return {
          _id: uid,
          name: user.name,
          totalMeal: userMeals,
          mealCost,
          singleCost: userSingleExpense,
          jointCost: userJointCost,
          totalCost,
          deposit: userDeposit,
          balance: userBalance
        };
      });

      // Only push months that actually have some data
      if (totalMeals > 0 || totalExpense > 0 || totalDeposit > 0) {
         allData.push({ month: globalStats, members: memberStats });
      }
    }

    return { success: true, data: JSON.parse(JSON.stringify(allData)) };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function addBulkMeals(monthId: string, date: Date, mealsData: { userId: string, breakfast: number, lunch: number, dinner: number, mealCount: number }[]) {
  try {
    await connectToDatabase();
    
    const startOfDay = new Date(date);
    startOfDay.setUTCHours(0, 0, 0, 0);
    const endOfDay = new Date(date);
    endOfDay.setUTCHours(23, 59, 59, 999);
    
    for (const data of mealsData) {
      if (data.mealCount === 0) continue; // Skip if no meals

      const user = await User.findById(data.userId);
      const month = await Month.findById(monthId);

      const existing = await Meal.findOne({
        monthId,
        userId: data.userId,
        date: { $gte: startOfDay, $lte: endOfDay }
      });
      
      if (existing) {
        existing.breakfast = (existing.breakfast || 0) + data.breakfast;
        existing.lunch = (existing.lunch || 0) + data.lunch;
        existing.dinner = (existing.dinner || 0) + data.dinner;
        existing.mealCount += data.mealCount;
        await existing.save();
        
        if (user && month) {
          try {
            const { updateDataInSheet } = await import('./sheetActions');
            await updateDataInSheet(month.sheetTabName, existing._id.toString(), {
              date: new Date(date).toLocaleDateString(),
              memberName: user.name,
              type: 'Meal',
              description: 'Daily Meal',
              amount: existing.mealCount,
              time: new Date().toLocaleTimeString(),
            });
          } catch (sheetErr) {
            console.error("Sheets update error in addBulkMeals:", sheetErr);
          }
        }
        // Calculate user's total meals in the active month
        const userMeals = await Meal.find({ monthId, userId: data.userId });
        const userTotalMeals = userMeals.reduce((sum, m) => sum + m.mealCount, 0);

        await createNotification("নতুন মিল যুক্ত হয়েছে", `আপনার অ্যাকাউন্টে নতুন মিল যুক্ত হয়েছে। যোগ করা হয়েছে: ${data.mealCount} টি। বর্তমান মোট মিল: ${userTotalMeals.toFixed(1)} টি।`, data.userId);
      } else {
        const newMeal = new Meal({ 
          monthId, 
          userId: data.userId, 
          date, 
          breakfast: data.breakfast,
          lunch: data.lunch,
          dinner: data.dinner,
          mealCount: data.mealCount 
        });
        await newMeal.save();
        
        if (user && month) {
          try {
            const { syncDataToSheet } = await import('./sheetActions');
            await syncDataToSheet(month.sheetTabName, {
              date: new Date(date).toLocaleDateString(),
              memberName: user.name,
              type: 'Meal',
              description: 'Daily Meal',
              amount: data.mealCount,
              time: new Date().toLocaleTimeString(),
              _id: newMeal._id.toString()
            });
          } catch (sheetErr) {
            console.error("Sheets sync error in addBulkMeals:", sheetErr);
          }
        }
        // Calculate user's total meals in the active month
        const userMeals = await Meal.find({ monthId, userId: data.userId });
        const userTotalMeals = userMeals.reduce((sum, m) => sum + m.mealCount, 0);

        await createNotification("নতুন মিল যুক্ত হয়েছে", `আপনার অ্যাকাউন্টে নতুন মিল যুক্ত হয়েছে। যোগ করা হয়েছে: ${data.mealCount} টি। বর্তমান মোট মিল: ${userTotalMeals.toFixed(1)} টি।`, data.userId);
      }
    }

    revalidatePath('/', 'layout');
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function removeMember(adminUserId: string, memberId: string) {
  try {
    await connectToDatabase();
    
    // Check if caller is admin
    const admin = await User.findById(adminUserId);
    if (!admin || (admin.role !== 'Super Admin' && admin.role !== 'Manager')) {
      return { success: false, error: 'Unauthorized. Only Manager or Super Admin can remove members.' };
    }

    const activeMonth = await Month.findOne({ isActive: true }).sort({ createdAt: -1 });
    if (!activeMonth) {
      return { success: false, error: 'No active month found.' };
    }

    // Check if member has active records in the running month
    const meals = await Meal.find({ monthId: activeMonth._id, userId: memberId });
    const deposits = await Deposit.find({ monthId: activeMonth._id, userId: memberId });
    const singleExpenses = await Expense.find({ monthId: activeMonth._id, userId: memberId, type: 'Single' });

    // Check if member is part of any Joint (shared) expense in this month
    const allExpenses = await Expense.find({ monthId: activeMonth._id });
    const users = await User.find({ role: { $ne: 'Pending' } });
    const numUsers = users.length;

    const userJointExpenses = allExpenses.filter(e => {
      if (e.type !== 'Joint') return false;
      if (!e.sharedBetween || e.sharedBetween.length === 0) return true;
      return e.sharedBetween.some((id: any) => id?.toString() === memberId.toString());
    });

    const jointCost = userJointExpenses.reduce((sum, e) => {
      const count = (!e.sharedBetween || e.sharedBetween.length === 0) ? numUsers : e.sharedBetween.length;
      return sum + (e.amount / count);
    }, 0);

    const totalMeals = meals.reduce((sum, m) => sum + m.mealCount, 0);
    const totalDeposit = deposits.reduce((sum, d) => sum + d.amount, 0);
    const singleCost = singleExpenses.reduce((sum, e) => sum + e.amount, 0);

    if (totalMeals > 0 || totalDeposit > 0 || singleCost > 0 || jointCost > 0) {
      const reasons = [];
      if (totalMeals > 0) reasons.push(`মিল (${totalMeals}টি)`);
      if (totalDeposit > 0) reasons.push(`জমা (${totalDeposit}৳)`);
      if (singleCost > 0) reasons.push(`একক খরচ (${singleCost}৳)`);
      if (jointCost > 0) reasons.push(`যৌথ খরচ (${jointCost.toFixed(2)}৳)`);
      return { 
        success: false, 
        error: `এই মেম্বারকে রিমুভ করা সম্ভব নয়। চলমান মাসে তার রেকর্ড রয়েছে — ${reasons.join(', ')}। মেম্বার ডিলিট করতে হলে সব রেকর্ড ০ (শূন্য) হতে হবে।` 
      };
    }

    // Completely remove member from database
    await User.findByIdAndDelete(memberId);

    // Optionally create a notification
    await import('./notificationActions').then(m => 
      m.createNotification('মেম্বার ডিলিট', `অ্যাডমিন একজন মেম্বারকে মেস থেকে রিমুভ করেছেন।`)
    );

    revalidatePath('/', 'layout');
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function getUserMealStatusForTodayAndTomorrow(userId: string) {
  try {
    await connectToDatabase();
    
    const user = await User.findById(userId).lean();
    if (!user || !user.messId) return { success: false, error: "Mess not found" };

    const activeMonth = await Month.findOne({ isActive: true, messId: user.messId }).sort({ createdAt: -1 }).lean();
    if (!activeMonth) {
      return { success: false, error: "No active month" };
    }

    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const todayEnd = new Date();
    todayEnd.setHours(23, 59, 59, 999);
    
    const tomorrowStart = new Date();
    tomorrowStart.setDate(tomorrowStart.getDate() + 1);
    tomorrowStart.setHours(0, 0, 0, 0);
    const tomorrowEnd = new Date();
    tomorrowEnd.setDate(tomorrowEnd.getDate() + 1);
    tomorrowEnd.setHours(23, 59, 59, 999);

    const todayMeal = await Meal.findOne({
      monthId: activeMonth._id,
      userId,
      date: { $gte: todayStart, $lte: todayEnd }
    });

    const tomorrowMeal = await Meal.findOne({
      monthId: activeMonth._id,
      userId,
      date: { $gte: tomorrowStart, $lte: tomorrowEnd }
    });

    const todayRequest = await MealRequest.findOne({
      monthId: activeMonth._id,
      userId,
      status: 'Pending',
      date: { $gte: todayStart, $lte: todayEnd }
    });

    const tomorrowRequest = await MealRequest.findOne({
      monthId: activeMonth._id,
      userId,
      status: 'Pending',
      date: { $gte: tomorrowStart, $lte: tomorrowEnd }
    });

    return {
      success: true,
      activeMonthId: activeMonth._id.toString(),
      today: todayMeal ? JSON.parse(JSON.stringify(todayMeal)) : { breakfast: 0, lunch: 0, dinner: 0, mealCount: 0, date: todayStart },
      tomorrow: tomorrowMeal ? JSON.parse(JSON.stringify(tomorrowMeal)) : { breakfast: 0, lunch: 0, dinner: 0, mealCount: 0, date: tomorrowStart },
      pendingToday: todayRequest ? JSON.parse(JSON.stringify(todayRequest)) : null,
      pendingTomorrow: tomorrowRequest ? JSON.parse(JSON.stringify(tomorrowRequest)) : null
    };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function updateUserMealForDate(
  userId: string,
  dateStr: 'today' | 'tomorrow',
  mealType: 'breakfast' | 'lunch' | 'dinner',
  newValue: number
) {
  try {
    await connectToDatabase();

    const activeMonth = await Month.findOne({ isActive: true }).sort({ createdAt: -1 });
    if (!activeMonth) {
      return { success: false, error: "No active month" };
    }

    const targetDate = new Date();
    if (dateStr === 'tomorrow') {
      targetDate.setDate(targetDate.getDate() + 1);
    }
    targetDate.setHours(12, 0, 0, 0); // avoids timezone matching edges

    const startOfDay = new Date(targetDate);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(targetDate);
    endOfDay.setHours(23, 59, 59, 999);

    let existing = await Meal.findOne({
      monthId: activeMonth._id,
      userId,
      date: { $gte: startOfDay, $lte: endOfDay }
    });

    const user = await User.findById(userId);
    if (!user) return { success: false, error: "User not found" };

    if (existing) {
      const oldVal = existing[mealType] || 0;
      existing[mealType] = newValue;
      
      existing.mealCount = (existing.breakfast || 0) + (existing.lunch || 0) + (existing.dinner || 0);
      
      if (existing.mealCount <= 0) {
        const idToDelete = existing._id.toString();
        await existing.deleteOne();
        try {
          await deleteDataFromSheet(activeMonth.sheetTabName, idToDelete);
        } catch (sheetErr) {
          console.error("Sheets delete error:", sheetErr);
        }
        await createNotification(
          "মিল বাতিল",
          `${user.name}-এর ${dateStr === 'today' ? 'আজকের' : 'আগামীকালের'} মিলের ${mealType === 'breakfast' ? 'সকাল' : mealType === 'lunch' ? 'দুপুর' : 'রাত'}-এর মিল বাতিল করা হয়েছে।`
        );
      } else {
        await existing.save();
        try {
          await updateDataInSheet(activeMonth.sheetTabName, existing._id.toString(), {
            type: 'Meal',
            amount: existing.mealCount,
            time: new Date().toLocaleTimeString(),
          });
        } catch (sheetErr) {
          console.error("Sheets update error:", sheetErr);
        }
        await createNotification(
          "মিল আপডেট",
          `${user.name}-এর ${dateStr === 'today' ? 'আজকের' : 'আগামীকালের'} মিলের ${mealType === 'breakfast' ? 'সকাল' : mealType === 'lunch' ? 'দুপুর' : 'রাত'}-এর মিল আপডেট করে ${newValue} টি করা হয়েছে।`
        );
      }
    } else {
      if (newValue > 0) {
        const newMeal = new Meal({
          monthId: activeMonth._id,
          userId,
          date: targetDate,
          breakfast: mealType === 'breakfast' ? newValue : 0,
          lunch: mealType === 'lunch' ? newValue : 0,
          dinner: mealType === 'dinner' ? newValue : 0,
          mealCount: newValue
        });
        await newMeal.save();

        try {
          await syncDataToSheet(activeMonth.sheetTabName, {
            date: targetDate.toLocaleDateString(),
            memberName: user.name,
            type: 'Meal',
            description: 'Daily Meal',
            amount: newValue,
            time: new Date().toLocaleTimeString(),
            _id: newMeal._id.toString()
          });
        } catch (sheetErr) {
          console.error("Sheets sync error:", sheetErr);
        }
        await createNotification(
          "নতুন মিল যুক্ত",
          `${user.name}-এর জন্য ${dateStr === 'today' ? 'আজকের' : 'আগামীকালের'} মিলের ${mealType === 'breakfast' ? 'সকাল' : mealType === 'lunch' ? 'দুপুর' : 'রাত'}-এর মিল ${newValue} টি যুক্ত করা হয়েছে।`
        );
      }
    }

    // Re-fetch and return updated status
    revalidatePath('/', 'layout');
    return getUserMealStatusForTodayAndTomorrow(userId);
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function createOrUpdateMealRequest(
  userId: string,
  dateStr: 'today' | 'tomorrow',
  breakfast: number,
  lunch: number,
  dinner: number
) {
  try {
    await connectToDatabase();
    
    const activeMonth = await Month.findOne({ isActive: true }).sort({ createdAt: -1 });
    if (!activeMonth) return { success: false, error: "No active month" };

    const targetDate = new Date();
    if (dateStr === 'tomorrow') {
      targetDate.setDate(targetDate.getDate() + 1);
    }
    targetDate.setHours(12, 0, 0, 0);

    const startOfDay = new Date(targetDate);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(targetDate);
    endOfDay.setHours(23, 59, 59, 999);

    let existingRequest = await MealRequest.findOne({
      monthId: activeMonth._id,
      userId,
      status: 'Pending',
      date: { $gte: startOfDay, $lte: endOfDay }
    });

    if (existingRequest) {
      existingRequest.breakfast = breakfast;
      existingRequest.lunch = lunch;
      existingRequest.dinner = dinner;
      await existingRequest.save();
    } else {
      await MealRequest.create({
        monthId: activeMonth._id,
        userId,
        date: targetDate,
        breakfast,
        lunch,
        dinner,
        status: 'Pending'
      });
    }

    const user = await User.findById(userId);
    if (user) {
      await createNotification(
        "মিলের অনুরোধ পাঠানো হয়েছে",
        `${user.name} ${dateStr === 'today' ? 'আজকের' : 'আগামীকালের'} মিলের জন্য অনুরোধ পাঠিয়েছেন (সকাল: ${breakfast}, দুপুর: ${lunch}, রাত: ${dinner})।`
      );
    }

    revalidatePath('/', 'layout');
    return getUserMealStatusForTodayAndTomorrow(userId);
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function getPendingMealRequests(userId: string) {
  try {
    await connectToDatabase();
    
    const user = await User.findById(userId).lean();
    if (!user || !user.messId) return { success: true, requests: [] };

    const activeMonth = await Month.findOne({ isActive: true, messId: user.messId }).sort({ createdAt: -1 }).lean();
    if (!activeMonth) return { success: true, requests: [] };

    const requests = await MealRequest.find({
      monthId: activeMonth._id,
      status: 'Pending'
    }).populate('userId', 'name email photoURL').lean();

    return { success: true, requests: JSON.parse(JSON.stringify(requests)) };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function approveMealRequest(requestId: string, adminUserId: string) {
  try {
    await connectToDatabase();

    const admin = await User.findById(adminUserId);
    if (!admin || (admin.role !== 'Super Admin' && admin.role !== 'Manager')) {
      return { success: false, error: 'Unauthorized.' };
    }

    const request = await MealRequest.findById(requestId);
    if (!request || request.status !== 'Pending') {
      return { success: false, error: 'Request not found or already processed.' };
    }

    const startOfDay = new Date(request.date);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(request.date);
    endOfDay.setHours(23, 59, 59, 999);

    let existingMeal = await Meal.findOne({
      monthId: request.monthId,
      userId: request.userId,
      date: { $gte: startOfDay, $lte: endOfDay }
    });

    const mealCount = request.breakfast + request.lunch + request.dinner;
    const user = await User.findById(request.userId);
    const month = await Month.findById(request.monthId);

    if (existingMeal) {
      const newBreakfast = (existingMeal.breakfast || 0) + request.breakfast;
      const newLunch = (existingMeal.lunch || 0) + request.lunch;
      const newDinner = (existingMeal.dinner || 0) + request.dinner;
      const newMealCount = newBreakfast + newLunch + newDinner;

      existingMeal.breakfast = newBreakfast;
      existingMeal.lunch = newLunch;
      existingMeal.dinner = newDinner;
      existingMeal.mealCount = newMealCount;

      if (newMealCount <= 0) {
        const idToDelete = existingMeal._id.toString();
        await existingMeal.deleteOne();
        if (month) {
          try {
            await deleteDataFromSheet(month.sheetTabName, idToDelete);
          } catch (sheetErr) {
            console.error("Sheets delete error:", sheetErr);
          }
        }
      } else {
        await existingMeal.save();
        if (month) {
          try {
            await updateDataInSheet(month.sheetTabName, existingMeal._id.toString(), {
              type: 'Meal',
              amount: newMealCount,
              time: new Date().toLocaleTimeString(),
            });
          } catch (sheetErr) {
            console.error("Sheets update error:", sheetErr);
          }
        }
      }
    } else {
      if (mealCount > 0) {
        const newMeal = new Meal({
          monthId: request.monthId,
          userId: request.userId,
          date: request.date,
          breakfast: request.breakfast,
          lunch: request.lunch,
          dinner: request.dinner,
          mealCount: mealCount
        });
        await newMeal.save();

        if (month && user) {
          try {
            await syncDataToSheet(month.sheetTabName, {
              date: new Date(request.date).toLocaleDateString(),
              memberName: user.name,
              type: 'Meal',
              description: 'Daily Meal',
              amount: mealCount,
              time: new Date().toLocaleTimeString(),
              _id: newMeal._id.toString()
            });
          } catch (sheetErr) {
            console.error("Sheets sync error:", sheetErr);
          }
        }
      }
    }

    request.status = 'Approved';
    await request.save();

    if (user) {
      await createNotification(
        "মিলের অনুরোধ অনুমোদিত",
        `ম্যানেজার ${user.name}-এর মিলের পরিবর্তন অনুরোধ অনুমোদন করেছেন।`
      );
    }

    revalidatePath('/', 'layout');

    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function rejectMealRequest(requestId: string, adminUserId: string) {
  try {
    await connectToDatabase();

    const admin = await User.findById(adminUserId);
    if (!admin || (admin.role !== 'Super Admin' && admin.role !== 'Manager')) {
      return { success: false, error: 'Unauthorized.' };
    }

    const request = await MealRequest.findById(requestId);
    if (!request || request.status !== 'Pending') {
      return { success: false, error: 'Request not found or already processed.' };
    }

    request.status = 'Rejected';
    await request.save();

    const user = await User.findById(request.userId);
    if (user) {
      await createNotification(
        "মিলের অনুরোধ প্রত্যাখ্যান",
        `ম্যানেজার ${user.name}-এর মিলের পরিবর্তন অনুরোধ প্রত্যাখ্যান করেছেন।`
      );
    }

    revalidatePath('/', 'layout');
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function getTodayMenu(userId: string) {
  try {
    await connectToDatabase();
    const user = await User.findById(userId).lean();
    if (!user || !user.messId) return { success: false, error: "Mess not found" };
    
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const todayEnd = new Date();
    todayEnd.setHours(23, 59, 59, 999);

    let menu = await Menu.findOne({
      messId: user.messId,
      date: { $gte: todayStart, $lte: todayEnd }
    }).lean();

    if (!menu) {
      return { success: true, menu: { breakfast: '', lunch: '', dinner: '', date: todayStart } };
    }

    return { success: true, menu: JSON.parse(JSON.stringify(menu)) };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function updateTodayMenu(breakfast: string, lunch: string, dinner: string, adminUserId: string) {
  try {
    await connectToDatabase();

    const admin = await User.findById(adminUserId).lean();
    if (!admin || (admin.role !== 'Super Admin' && admin.role !== 'Manager') || !admin.messId) {
      return { success: false, error: 'Unauthorized.' };
    }

    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const todayEnd = new Date();
    todayEnd.setHours(23, 59, 59, 999);

    let menu = await Menu.findOne({
      messId: admin.messId,
      date: { $gte: todayStart, $lte: todayEnd }
    });

    if (menu) {
      menu.breakfast = breakfast;
      menu.lunch = lunch;
      menu.dinner = dinner;
      await menu.save();
    } else {
      menu = await Menu.create({
        date: todayStart,
        breakfast,
        lunch,
        dinner,
        messId: admin.messId
      });
    }

    await createNotification(
      "আজকের মেনু আপডেট করা হয়েছে",
      `আজকের খাবারের মেনু আপডেট করা হয়েছে (সকাল: ${breakfast || 'নাই'}, দুপুর: ${lunch || 'নাই'}, রাত: ${dinner || 'নাই'})।`,
      undefined,
      admin.messId.toString()
    );

    revalidatePath('/', 'layout');
    return { success: true, menu: JSON.parse(JSON.stringify(menu)) };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function getLatestNotices(userId: string) {
  try {
    await connectToDatabase();

    const user = await User.findById(userId).lean();
    if (!user || !user.messId) return { success: true, notices: [] };

    const notices = await Notice.find({ messId: user.messId })
      .sort({ createdAt: -1 })
      .limit(5)
      .populate('createdBy', 'name role')
      .populate('acknowledgedBy', 'name role')
      .lean();

    return { success: true, notices: JSON.parse(JSON.stringify(notices)) };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function createNotice(title: string, content: string, adminUserId: string) {
  try {
    await connectToDatabase();

    const admin = await User.findById(adminUserId).lean();
    if (!admin || (admin.role !== 'Super Admin' && admin.role !== 'Manager') || !admin.messId) {
      return { success: false, error: 'Unauthorized.' };
    }

    const notice = await Notice.create({
      title,
      content,
      createdBy: adminUserId,
      messId: admin.messId
    });

    await createNotification(
      "মেসে নতুন নোটিশ দেওয়া হয়েছে",
      `শিরোনাম: ${title}`,
      undefined,
      admin.messId.toString()
    );

    revalidatePath('/', 'layout');
    return { success: true, notice: JSON.parse(JSON.stringify(notice)) };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function deleteNotice(noticeId: string, adminUserId: string) {
  try {
    await connectToDatabase();

    const admin = await User.findById(adminUserId);
    if (!admin || (admin.role !== 'Super Admin' && admin.role !== 'Manager')) {
      return { success: false, error: 'Unauthorized.' };
    }

    await Notice.findByIdAndDelete(noticeId);

    revalidatePath('/', 'layout');
    revalidatePath('/notice');
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function updateNotice(noticeId: string, title: string, content: string, adminUserId: string) {
  try {
    await connectToDatabase();

    const admin = await User.findById(adminUserId);
    if (!admin || (admin.role !== 'Super Admin' && admin.role !== 'Manager')) {
      return { success: false, error: 'Unauthorized.' };
    }

    const notice = await Notice.findById(noticeId);
    if (!notice) {
      return { success: false, error: 'Notice not found.' };
    }

    notice.title = title;
    notice.content = content;
    await notice.save();

    revalidatePath('/', 'layout');
    revalidatePath('/notice');
    return { success: true, notice: JSON.parse(JSON.stringify(notice)) };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function checkAndNotifyLowBalance(userId: string, balance: number) {
  try {
    await connectToDatabase();

    if (balance > 0) return { success: true };

    const oneDayAgo = new Date();
    oneDayAgo.setDate(oneDayAgo.getDate() - 1);

    const existingWarning = await Notification.findOne({
      userId,
      title: "কম ব্যালেন্স সতর্কতা ⚠️",
      createdAt: { $gte: oneDayAgo }
    });

    if (!existingWarning) {
      await Notification.create({
        title: "কম ব্যালেন্স সতর্কতা ⚠️",
        message: `আপনার বর্তমান ব্যালেন্স ${balance.toFixed(0)} ৳! মেসের মিল সচল রাখতে এবং মেস খরচ পরিচালনায় দ্রুত টাকা জমা করুন।`,
        userId
      });
    }

    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function submitMenuRating(userId: string, date: Date, type: 'breakfast' | 'lunch' | 'dinner', rating: number) {
  try {
    await connectToDatabase();
    
    const ratingDate = new Date(date);
    ratingDate.setHours(0, 0, 0, 0);

    let menuRating = await MenuRating.findOne({ userId, date: ratingDate });

    if (menuRating) {
      menuRating[type] = rating;
      await menuRating.save();
    } else {
      menuRating = await MenuRating.create({
        userId,
        date: ratingDate,
        [type]: rating
      });
    }

    revalidatePath('/', 'layout');
    return { success: true, rating: JSON.parse(JSON.stringify(menuRating)) };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function getMenuRatings(date: Date, requestingUserId?: string) {
  try {
    await connectToDatabase();

    const ratingDate = new Date(date);
    ratingDate.setHours(0, 0, 0, 0);

    let ratingsList: any[] = [];
    if (requestingUserId) {
      const user = await User.findById(requestingUserId).lean();
      if (user && user.messId) {
        const messUsers = await User.find({ messId: user.messId }).select('_id').lean();
        const messUserIds = messUsers.map(u => u._id);
        ratingsList = await MenuRating.find({
          date: ratingDate,
          userId: { $in: messUserIds }
        }).populate('userId', 'name role').lean();
      }
    } else {
      ratingsList = await MenuRating.find({ date: ratingDate }).populate('userId', 'name role').lean();
    }

    // Calculate averages
    let bSum = 0, bCount = 0;
    let lSum = 0, lCount = 0;
    let dSum = 0, dCount = 0;

    ratingsList.forEach((r) => {
      if (r.breakfast > 0) {
        bSum += r.breakfast;
        bCount++;
      }
      if (r.lunch > 0) {
        lSum += r.lunch;
        lCount++;
      }
      if (r.dinner > 0) {
        dSum += r.dinner;
        dCount++;
      }
    });

    const averages = {
      breakfast: bCount > 0 ? parseFloat((bSum / bCount).toFixed(1)) : 0,
      lunch: lCount > 0 ? parseFloat((lSum / lCount).toFixed(1)) : 0,
      dinner: dCount > 0 ? parseFloat((dSum / dCount).toFixed(1)) : 0,
      totalCount: ratingsList.length
    };

    // Get specific rating of requesting user
    let userRating = { breakfast: 0, lunch: 0, dinner: 0 };
    if (requestingUserId) {
      const myRating = ratingsList.find((r) => r.userId?._id?.toString() === requestingUserId);
      if (myRating) {
        userRating = {
          breakfast: myRating.breakfast || 0,
          lunch: myRating.lunch || 0,
          dinner: myRating.dinner || 0
        };
      }
    }

    return { 
      success: true, 
      averages, 
      userRating,
      allRatings: JSON.parse(JSON.stringify(ratingsList)) 
    };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function getUnifiedDashboardData(userId: string) {
  try {
    await connectToDatabase();

    // Fetch active month first (needed for other queries)
    const activeMonth = await Month.findOne({ isActive: true }).sort({ createdAt: -1 }).lean();
    if (!activeMonth) {
      return {
        success: true,
        dashboard: { stats: null, members: [] },
        bazaarSchedules: [],
        notifications: [],
        contacts: [],
        bazaarChecklist: [],
        userMeals: null,
        pendingRequests: [],
        menu: null,
        notices: [],
        ratings: null
      };
    }

    // Run all other queries concurrently on the server
    const [
      dashboardRes,
      bazaarSchedulesRes,
      notificationsRes,
      contactsRes,
      bazaarChecklistRes,
      userMealsRes,
      pendingRequestsRes,
      menuRes,
      noticesRes,
      ratingsRes
    ] = await Promise.all([
      getDashboardData(userId),
      getBazaarSchedules(userId),
      getNotifications(userId),
      getContacts(userId),
      getBazaarChecklist(userId),
      getUserMealStatusForTodayAndTomorrow(userId),
      getPendingMealRequests(userId),
      getTodayMenu(userId),
      getLatestNotices(userId),
      getMenuRatings(new Date(), userId)
    ]);

    return {
      success: true,
      dashboard: dashboardRes.success ? dashboardRes : null,
      bazaarSchedules: bazaarSchedulesRes.success ? bazaarSchedulesRes.schedules : [],
      notifications: notificationsRes.success ? notificationsRes.notifications : [],
      contacts: contactsRes.success ? (contactsRes as any).contacts : [],
      bazaarChecklist: bazaarChecklistRes.success ? bazaarChecklistRes.items : [],
      userMeals: userMealsRes.success ? userMealsRes : null,
      pendingRequests: pendingRequestsRes.success ? pendingRequestsRes.requests : [],
      menu: menuRes.success ? menuRes.menu : null,
      notices: noticesRes.success ? noticesRes.notices : [],
      ratings: ratingsRes.success ? ratingsRes : null
    };
  } catch (error: any) {
    console.error("Unified dashboard fetch error:", error);
    return { success: false, error: error.message };
  }
}

export async function acknowledgeNotice(noticeId: string, userId: string) {
  try {
    await connectToDatabase();
    
    await Notice.findByIdAndUpdate(noticeId, {
      $addToSet: { acknowledgedBy: new mongoose.Types.ObjectId(userId) }
    });
    
    revalidatePath('/');
    revalidatePath('/notice');
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}


