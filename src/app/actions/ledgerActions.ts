"use server";

import connectToDatabase from "@/lib/mongoose";
import Meal from "@/models/Meal";
import Expense from "@/models/Expense";
import Deposit from "@/models/Deposit";
import Month from "@/models/Month";
import User from "@/models/User";

export async function getLedgerData(userId: string) {
  try {
    await connectToDatabase();
    
    const user = await User.findById(userId).lean();
    if (!user || !user.messId) return { success: true, entries: [] };
    
    const activeMonth = await Month.findOne({ isActive: true, messId: user.messId }).sort({ createdAt: -1 }).lean();
    if (!activeMonth) return { success: true, entries: [] };

    const users = await User.find({ messId: user.messId }).lean();
    const userMap = users.reduce((acc, u) => {
      acc[u._id.toString()] = u.name;
      return acc;
    }, {} as Record<string, string>);

    const meals = await Meal.find({ monthId: activeMonth._id }).lean();
    const expenses = await Expense.find({ monthId: activeMonth._id }).lean();
    const deposits = await Deposit.find({ monthId: activeMonth._id }).lean();

    const entries = [];

    for (const meal of meals) {
      entries.push({
        _id: meal._id.toString(),
        type: 'Meal',
        date: meal.date,
        memberName: userMap[meal.userId.toString()] || 'Unknown',
        amount: meal.mealCount,
        description: 'Daily Meal',
        createdAt: meal.createdAt || meal.date
      });
    }

    for (const expense of expenses) {
      entries.push({
        _id: expense._id.toString(),
        type: `Expense (${expense.type})`,
        date: expense.date,
        memberName: expense.userId ? (userMap[expense.userId.toString()] || 'Unknown') : 'Mess Committee',
        amount: expense.amount,
        description: expense.description,
        createdAt: expense.createdAt || expense.date
      });
    }

    for (const deposit of deposits) {
      entries.push({
        _id: deposit._id.toString(),
        type: 'Deposit',
        date: deposit.date,
        memberName: userMap[deposit.userId.toString()] || 'Unknown',
        amount: deposit.amount,
        description: 'Money Deposited',
        createdAt: deposit.createdAt || deposit.date
      });
    }

    // Sort descending by date (newest first)
    entries.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    return { success: true, entries: JSON.parse(JSON.stringify(entries)) };
  } catch (error: any) {
    console.error("Ledger data error:", error);
    return { success: false, error: error.message };
  }
}
