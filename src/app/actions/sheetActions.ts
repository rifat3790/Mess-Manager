"use server";

import { getGoogleSheet } from "@/lib/google-sheets";
import connectToDatabase from "@/lib/mongoose";
import Month from "@/models/Month";
import User from "@/models/User";
import Meal from "@/models/Meal";
import Expense from "@/models/Expense";
import Deposit from "@/models/Deposit";

export async function createNewMonthSheet(monthName: string, startDate: Date, carryOverBalance: boolean = false) {
  try {
    await connectToDatabase();
    const doc = await getGoogleSheet();
    
    const existingSheet = Object.values(doc.sheetsByTitle).find(
      (sheet) => sheet.title === monthName
    );

    let sheet;
    if (existingSheet) {
      sheet = existingSheet;
    } else {
      sheet = await doc.addSheet({ title: monthName, headerValues: [
        'Date', 'Member Name', 'Type (Meal/Expense)', 'Description', 'Amount/Count', 'Time Added', '_id'
      ]});
      
      await sheet.loadCells('A1:G1');
      for (let i = 0; i < 7; i++) {
        const cell = sheet.getCell(0, i);
        cell.textFormat = { bold: true };
        cell.backgroundColor = { red: 0.9, green: 0.9, blue: 0.9, alpha: 1 };
      }
      await sheet.saveUpdatedCells();
    }

    // 1. Calculate balances from previous active month if requested
    const carryOverList: { userId: string; balance: number; userName: string }[] = [];
    if (carryOverBalance) {
      const prevActiveMonth = await Month.findOne({ isActive: true }).sort({ createdAt: -1 });
      if (prevActiveMonth) {
        const users = await User.find({ role: { $ne: 'Pending' } });
        const meals = await Meal.find({ monthId: prevActiveMonth._id });
        const expenses = await Expense.find({ monthId: prevActiveMonth._id });
        const deposits = await Deposit.find({ monthId: prevActiveMonth._id });

        const totalMeals = meals.reduce((sum, m) => sum + m.mealCount, 0);
        const mealExpenses = expenses.filter(e => e.type === 'Meal').reduce((sum, e) => sum + e.amount, 0);
        const mealRate = totalMeals > 0 ? mealExpenses / totalMeals : 0;
        const numUsers = users.length;

        for (const user of users) {
          const userMeals = meals.filter(m => m.userId.toString() === user._id.toString()).reduce((sum, m) => sum + m.mealCount, 0);
          const userDeposit = deposits.filter(d => d.userId.toString() === user._id.toString()).reduce((sum, d) => sum + d.amount, 0);
          const userSingleExpense = expenses.filter(e => e.type === 'Single' && e.userId?.toString() === user._id.toString()).reduce((sum, e) => sum + e.amount, 0);

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
        const initialDeposit = await Deposit.create({
          monthId: newMonth._id,
          userId: item.userId,
          amount: item.balance,
          date: new Date(startDate).setHours(0,0,0,0)
        });

        await syncDataToSheet(newMonth.sheetTabName, {
          date: new Date(startDate).toLocaleDateString(),
          memberName: item.userName,
          type: 'Deposit',
          description: 'Balance Carried Over',
          amount: item.balance,
          time: new Date().toLocaleTimeString(),
          _id: initialDeposit._id.toString()
        });
      }
    }

    return { success: true, month: JSON.parse(JSON.stringify(newMonth)) };
  } catch (error: any) {
    console.error("Error creating new month sheet:", error);
    return { success: false, error: error.message };
  }
}

export async function syncDataToSheet(
  monthName: string, 
  data: { date: string; memberName: string; type: string; description: string; amount: number; time: string; _id: string }
) {
  try {
    const doc = await getGoogleSheet();
    const sheet = doc.sheetsByTitle[monthName];
    
    if (!sheet) throw new Error(`Sheet with name ${monthName} not found.`);

    await sheet.addRow({
      'Date': data.date,
      'Member Name': data.memberName,
      'Type (Meal/Expense)': data.type,
      'Description': data.description,
      'Amount/Count': data.amount,
      'Time Added': data.time,
      '_id': data._id
    });

    return { success: true };
  } catch (error: any) {
    console.error("Error syncing data to sheet:", error);
    return { success: false, error: error.message };
  }
}

export async function updateDataInSheet(
  monthName: string,
  id: string,
  newData: { date?: string; memberName?: string; type?: string; description?: string; amount?: number; time?: string }
) {
  try {
    const doc = await getGoogleSheet();
    const sheet = doc.sheetsByTitle[monthName];
    if (!sheet) throw new Error(`Sheet with name ${monthName} not found.`);

    const rows = await sheet.getRows();
    const row = rows.find(r => String(r.get('_id')) === String(id));
    
    if (row) {
      if (newData.date) row.assign({ 'Date': newData.date });
      if (newData.memberName) row.assign({ 'Member Name': newData.memberName });
      if (newData.type) row.assign({ 'Type (Meal/Expense)': newData.type });
      if (newData.description) row.assign({ 'Description': newData.description });
      if (newData.amount !== undefined) row.assign({ 'Amount/Count': newData.amount });
      if (newData.time) row.assign({ 'Time Added': newData.time });
      
      await row.save();
      console.log(`Successfully updated row in Google Sheets for ID ${id}`);
    } else {
      console.error(`Row with ID ${id} not found in Google Sheets`);
    }

    return { success: true };
  } catch (error: any) {
    console.error("Error updating sheet data:", error);
    return { success: false, error: error.message };
  }
}

export async function deleteDataFromSheet(monthName: string, id: string) {
  try {
    const doc = await getGoogleSheet();
    const sheet = doc.sheetsByTitle[monthName];
    if (!sheet) throw new Error(`Sheet with name ${monthName} not found.`);

    const rows = await sheet.getRows();
    const row = rows.find(r => r.get('_id') === id);
    
    if (row) {
      await row.delete();
    }

    return { success: true };
  } catch (error: any) {
    console.error("Error deleting sheet data:", error);
    return { success: false, error: error.message };
  }
}
