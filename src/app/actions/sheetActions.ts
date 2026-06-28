"use server";

import { getGoogleSheet } from "@/lib/google-sheets";
import connectToDatabase from "@/lib/mongoose";
import Month from "@/models/Month";

export async function createNewMonthSheet(monthName: string, startDate: Date) {
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

    const newMonth = await Month.create({
      name: monthName,
      startDate: startDate,
      sheetTabName: monthName,
      isActive: true
    });

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
