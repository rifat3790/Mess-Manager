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
    const jointCostPerPerson = numUsers > 0 ? jointExpenses / numUsers : 0;

    const memberStats = users.map(user => {
      const userMeals = meals.filter(m => m.userId.toString() === user._id.toString()).reduce((sum, m) => sum + m.mealCount, 0);
      const userDeposit = deposits.filter(d => d.userId.toString() === user._id.toString()).reduce((sum, d) => sum + d.amount, 0);
      const userSingleExpense = expenses.filter(e => e.type === 'Single' && e.userId?.toString() === user._id.toString()).reduce((sum, e) => sum + e.amount, 0);
      
      const mealCost = userMeals * mealRate;
      const totalCost = mealCost + jointCostPerPerson + userSingleExpense;
      const userBalance = userDeposit - totalCost;

      return {
        _id: user._id.toString(),
        name: user.name,
        role: user.role,
        totalMeal: userMeals,
        mealCost,
        singleCost: userSingleExpense,
        jointCost: jointCostPerPerson,
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
      const jointCostPerPerson = numUsers > 0 ? jointExpenses / numUsers : 0;

      const memberStats = users.map(user => {
        const userMeals = meals.filter(m => m.userId.toString() === user._id.toString()).reduce((sum, m) => sum + m.mealCount, 0);
        const userDeposit = deposits.filter(d => d.userId.toString() === user._id.toString()).reduce((sum, d) => sum + d.amount, 0);
        const userSingleExpense = expenses.filter(e => e.type === 'Single' && e.userId?.toString() === user._id.toString()).reduce((sum, e) => sum + e.amount, 0);
        
        const mealCost = userMeals * mealRate;
        const totalCost = mealCost + jointCostPerPerson + userSingleExpense;
        const userBalance = userDeposit - totalCost;

        return {
          _id: user._id.toString(),
          name: user.name,
          totalMeal: userMeals,
          mealCost,
          singleCost: userSingleExpense,
          jointCost: jointCostPerPerson,
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
