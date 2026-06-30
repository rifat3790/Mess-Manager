"use server";

import connectToDatabase from "@/lib/mongoose";
import Meal from "@/models/Meal";
import Expense from "@/models/Expense";
import Deposit from "@/models/Deposit";
import Month from "@/models/Month";
import User from "@/models/User";
import { syncDataToSheet, updateDataInSheet, deleteDataFromSheet } from "./sheetActions";
import { createNotification } from "./notificationActions";
import mongoose from "mongoose";
import MealRequest from "@/models/MealRequest";
import { revalidatePath } from "next/cache";
import Notice from "@/models/Notice";
import Menu from "@/models/Menu";

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

    await syncDataToSheet(month.sheetTabName, {
      date: new Date(date).toLocaleDateString(),
      memberName: user.name,
      type: 'Meal',
      description: 'Daily Meal',
      amount: mealCount,
      time: new Date().toLocaleTimeString(),
      _id: meal._id.toString()
    });

    await createNotification("নতুন মিল যুক্ত করা হয়েছে", `${user.name}-এর জন্য ${mealCount} টি মিল যুক্ত করা হয়েছে।`);

    revalidatePath('/', 'layout');
    return { success: true, meal: JSON.parse(JSON.stringify(meal)) };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function addExpense(monthId: string, userId: string | null, type: 'Meal' | 'Joint' | 'Single', amount: number, description: string, date: Date, sharedBetween?: string[]) {
  try {
    await connectToDatabase();
    
    const expense = await Expense.create({
      monthId,
      userId: userId || null,
      type,
      amount,
      description,
      date: new Date(date).setHours(0,0,0,0),
      sharedBetween
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

    await createNotification("নতুন খরচ যুক্ত করা হয়েছে", `${memberName}-এর ${amount} টাকার একটি নতুন খরচ (${type}) যুক্ত করা হয়েছে।`);

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

    await syncDataToSheet(month.sheetTabName, {
      date: new Date(date).toLocaleDateString(),
      memberName: user.name,
      type: 'Deposit',
      description: 'Money Deposited',
      amount,
      time: new Date().toLocaleTimeString(),
      _id: deposit._id.toString()
    });

    await createNotification("নতুন জমা", `${user.name} এর অ্যাকাউন্টে ${amount} টাকা জমা করা হয়েছে।`);

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
    if (month) await deleteDataFromSheet(month.sheetTabName, id);
    
    if (user) await createNotification("মিল ডিলিট", `${user.name}-এর একটি মিল রেকর্ড ডিলিট করা হয়েছে।`);

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
    if (month) await deleteDataFromSheet(month.sheetTabName, id);

    await createNotification("খরচ ডিলিট", `${memberName}-এর একটি খরচের রেকর্ড ডিলিট করা হয়েছে।`);

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
    if (month) await deleteDataFromSheet(month.sheetTabName, id);

    if (user) await createNotification("জমা ডিলিট", `${user.name}-এর একটি টাকা জমার রেকর্ড ডিলিট করা হয়েছে।`);

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
    if (user) {
      await createNotification("মিল আপডেট", `${user.name}-এর মিল সংখ্যা আপডেট করে ${mealCount} টি করা হয়েছে।`);
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
    
    const month = await Month.findById(deposit.monthId);
    if (month) {
      await updateDataInSheet(month.sheetTabName, id, {
        type: 'Deposit',
        amount: amount
      });
    }

    const user = await User.findById(deposit.userId);
    if (user) {
      await createNotification("জমা আপডেট", `${user.name}-এর জমার পরিমাণ আপডেট করে ${amount} টাকা করা হয়েছে।`);
    }

    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function getActiveMonth() {
  try {
    await connectToDatabase();
    const month = await Month.findOne({ isActive: true }).sort({ createdAt: -1 });
    if (!month) return { success: false, error: "No active month found" };
    return { success: true, month: JSON.parse(JSON.stringify(month)) };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function setActiveMonth(monthId: string) {
  try {
    await connectToDatabase();
    // Deactivate all months
    await Month.updateMany({}, { isActive: false });
    // Activate selected month
    await Month.findByIdAndUpdate(monthId, { isActive: true });
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function getAllMonths() {
  try {
    await connectToDatabase();
    const months = await Month.find({}).sort({ createdAt: -1 });
    return { success: true, months: JSON.parse(JSON.stringify(months)) };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function getMembers() {
  try {
    await connectToDatabase();
    const users = await User.find({ role: { $in: ['Member', 'Manager', 'Super Admin'] } });
    return { success: true, users: JSON.parse(JSON.stringify(users)) };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function getDashboardData() {
  try {
    await connectToDatabase();
    
    const activeMonth = await Month.findOne({ isActive: true }).sort({ createdAt: -1 });
    if (!activeMonth) return { success: true, stats: null, members: [] };

    const users = await User.find({ role: { $ne: 'Pending' } });

    const meals = await Meal.find({ monthId: activeMonth._id });
    const expenses = await Expense.find({ monthId: activeMonth._id });
    const deposits = await Deposit.find({ monthId: activeMonth._id });

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

    const memberStats = users.map(user => {
      const userMeals = meals.filter(m => m.userId.toString() === user._id.toString()).reduce((sum, m) => sum + m.mealCount, 0);
      const userDeposit = deposits.filter(d => d.userId.toString() === user._id.toString()).reduce((sum, d) => sum + d.amount, 0);
      const userSingleExpense = expenses.filter(e => e.type === 'Single' && e.userId?.toString() === user._id.toString()).reduce((sum, e) => sum + e.amount, 0);
      
      // Calculate user's specific joint cost
      const userJointExpenses = expenses.filter(e => {
        if (e.type !== 'Joint') return false;
        if (!e.sharedBetween || e.sharedBetween.length === 0) return true;
        return e.sharedBetween.some((id: any) => id.toString() === user._id.toString());
      });

      const userJointCost = userJointExpenses.reduce((sum, e) => {
        const count = (!e.sharedBetween || e.sharedBetween.length === 0) ? numUsers : e.sharedBetween.length;
        return sum + (e.amount / count);
      }, 0);

      const mealCost = userMeals * mealRate;
      const totalCost = mealCost + userJointCost + userSingleExpense;
      const userBalance = userDeposit - totalCost;

      return {
        _id: user._id.toString(),
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

    return { success: true, stats: globalStats, members: memberStats };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function getAllMonthsReportData() {
  try {
    await connectToDatabase();
    
    const months = await Month.find().sort({ createdAt: -1 });
    const users = await User.find({ role: { $ne: 'Pending' } });
    
    const allData = [];
    
    for (const month of months) {
      const meals = await Meal.find({ monthId: month._id });
      const expenses = await Expense.find({ monthId: month._id });
      const deposits = await Deposit.find({ monthId: month._id });

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

      const memberStats = users.map(user => {
        const userMeals = meals.filter(m => m.userId.toString() === user._id.toString()).reduce((sum, m) => sum + m.mealCount, 0);
        const userDeposit = deposits.filter(d => d.userId.toString() === user._id.toString()).reduce((sum, d) => sum + d.amount, 0);
        const userSingleExpense = expenses.filter(e => e.type === 'Single' && e.userId?.toString() === user._id.toString()).reduce((sum, e) => sum + e.amount, 0);
        
        // Calculate user's specific joint cost
        const userJointExpenses = expenses.filter(e => {
          if (e.type !== 'Joint') return false;
          if (!e.sharedBetween || e.sharedBetween.length === 0) return true;
          return e.sharedBetween.some((id: any) => id.toString() === user._id.toString());
        });

        const userJointCost = userJointExpenses.reduce((sum, e) => {
          const count = (!e.sharedBetween || e.sharedBetween.length === 0) ? numUsers : e.sharedBetween.length;
          return sum + (e.amount / count);
        }, 0);

        const mealCost = userMeals * mealRate;
        const totalCost = mealCost + userJointCost + userSingleExpense;
        const userBalance = userDeposit - totalCost;

        return {
          _id: user._id.toString(),
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
        
        const user = await User.findById(data.userId);
        const month = await Month.findById(monthId);
        if (user && month) {
          const { updateDataInSheet } = await import('./sheetActions');
          await updateDataInSheet(month.sheetTabName, existing._id.toString(), {
            date: new Date(date).toLocaleDateString(),
            memberName: user.name,
            type: 'Meal',
            description: 'Daily Meal',
            amount: existing.mealCount,
            time: new Date().toLocaleTimeString(),
          });
        }
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
        
        const user = await User.findById(data.userId);
        const month = await Month.findById(monthId);
        if (user && month) {
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
        }
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
    const expenses = await Expense.find({ monthId: activeMonth._id, userId: memberId, type: 'Single' });

    const totalMeals = meals.reduce((sum, m) => sum + m.mealCount, 0);
    const totalDeposit = deposits.reduce((sum, d) => sum + d.amount, 0);
    const singleCost = expenses.reduce((sum, e) => sum + e.amount, 0);

    if (totalMeals > 0 || totalDeposit > 0 || singleCost > 0) {
      return { 
        success: false, 
        error: 'এই মেম্বারকে রিমুভ করা সম্ভব নয়। চলমান মাসে তার নামে মিল, জমা বা একক খরচ যুক্ত আছে। মেম্বার ডিলিট করতে হলে সব রেকর্ড ০ (শূন্য) হতে হবে।' 
      };
    }

    // Completely remove member from database
    await User.findByIdAndDelete(memberId);

    // Optionally create a notification
    await import('./notificationActions').then(m => 
      m.createNotification('মেম্বার ডিলিট', `অ্যাডমিন একজন মেম্বারকে মেস থেকে রিমুভ করেছেন।`)
    );

    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function getUserMealStatusForTodayAndTomorrow(userId: string) {
  try {
    await connectToDatabase();
    
    const activeMonth = await Month.findOne({ isActive: true }).sort({ createdAt: -1 });
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

export async function getPendingMealRequests() {
  try {
    await connectToDatabase();
    
    const activeMonth = await Month.findOne({ isActive: true }).sort({ createdAt: -1 });
    if (!activeMonth) return { success: true, requests: [] };

    const requests = await MealRequest.find({
      monthId: activeMonth._id,
      status: 'Pending'
    }).populate('userId', 'name email photoURL');

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

export async function getTodayMenu() {
  try {
    await connectToDatabase();
    
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const todayEnd = new Date();
    todayEnd.setHours(23, 59, 59, 999);

    let menu = await Menu.findOne({
      date: { $gte: todayStart, $lte: todayEnd }
    });

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

    const admin = await User.findById(adminUserId);
    if (!admin || (admin.role !== 'Super Admin' && admin.role !== 'Manager')) {
      return { success: false, error: 'Unauthorized.' };
    }

    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const todayEnd = new Date();
    todayEnd.setHours(23, 59, 59, 999);

    let menu = await Menu.findOne({
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
        dinner
      });
    }

    await createNotification("আজকের মেনু আপডেট করা হয়েছে", `আজকের খাবারের মেনু আপডেট করা হয়েছে (সকাল: ${breakfast || 'নাই'}, দুপুর: ${lunch || 'নাই'}, রাত: ${dinner || 'নাই'})।`);

    revalidatePath('/', 'layout');
    return { success: true, menu: JSON.parse(JSON.stringify(menu)) };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function getLatestNotices() {
  try {
    await connectToDatabase();

    const notices = await Notice.find()
      .sort({ createdAt: -1 })
      .limit(5)
      .populate('createdBy', 'name role');

    return { success: true, notices: JSON.parse(JSON.stringify(notices)) };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function createNotice(title: string, content: string, adminUserId: string) {
  try {
    await connectToDatabase();

    const admin = await User.findById(adminUserId);
    if (!admin || (admin.role !== 'Super Admin' && admin.role !== 'Manager')) {
      return { success: false, error: 'Unauthorized.' };
    }

    const notice = await Notice.create({
      title,
      content,
      createdBy: adminUserId
    });

    await createNotification("মেসে নতুন নোটিশ দেওয়া হয়েছে", `শিরোনাম: ${title}`);

    revalidatePath('/', 'layout');
    return { success: true, notice: JSON.parse(JSON.stringify(notice)) };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}


