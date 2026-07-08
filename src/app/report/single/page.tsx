"use client";

import { useAuth } from '@/context/AuthContext';
import { FileText, Loader2, Download, Printer, Trash2 } from 'lucide-react';
import { useEffect, useState, useRef } from 'react';
import { getDashboardData, removeMember } from '@/app/actions/dataActions';
import { cn } from '@/lib/utils';
import jsPDF from 'jspdf';
import { LedgerTable } from '@/components/LedgerTable';
import { toast } from 'react-hot-toast';

export default function SingleReportPage() {
  const { mongoUser } = useAuth();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState(false);
  const reportRef = useRef<HTMLDivElement>(null);
  
  useEffect(() => {
    const fetchData = async () => {
      if (!mongoUser?._id) return;
      const res = await getDashboardData(mongoUser._id);
      if (res.success) {
        setData(res);
      }
      setLoading(false);
    };
    if (mongoUser) {
      fetchData();
    }
  }, [mongoUser]);

  const handleRemoveMember = async (member: any) => {
    if (member.totalMeal > 0 || member.deposit > 0 || member.singleCost > 0 || (member.jointCost || 0) > 0) {
      const reasons = [];
      if (member.totalMeal > 0) reasons.push(`মিল (${member.totalMeal}টি)`);
      if (member.deposit > 0) reasons.push(`জমা (${member.deposit}৳)`);
      if (member.singleCost > 0) reasons.push(`একক খরচ (${member.singleCost}৳)`);
      if ((member.jointCost || 0) > 0) reasons.push(`যৌথ খরচ (${member.jointCost.toFixed(2)}৳)`);
      toast.error(`এই মেম্বারকে রিমুভ করা সম্ভব নয়। চলমান মাসে তার রেকর্ড রয়েছে — ${reasons.join(', ')}। মেম্বার ডিলিট করতে হলে সব রেকর্ড ০ (শূন্য) হতে হবে।`);
      return;
    }
    
    if (window.confirm(`আপনি কি নিশ্চিত যে আপনি ${member.name}-কে মেস থেকে এবং ডাটাবেস থেকে একেবারে মুছে ফেলতে চান?`)) {
      if (!mongoUser) return;
      const res = await removeMember(mongoUser._id, member._id);
      if (res.success) {
        toast.success(`${member.name}-কে সফলভাবে রিমুভ করা হয়েছে।`);
        // Refresh data
        setLoading(true);
        const newData = await getDashboardData(mongoUser._id);
        if (newData.success) setData(newData);
        setLoading(false);
      } else {
        toast.error('রিমুভ করতে সমস্যা হয়েছে: ' + res.error);
      }
    }
  };

  const handleDownloadPDF = async () => {
    if (!data?.stats) return;
    try {
      setDownloading(true);

      const pdf = new jsPDF('p', 'mm', 'a4');
      
      const pageWidth = pdf.internal.pageSize.getWidth() || 210;
      const pageHeight = pdf.internal.pageSize.getHeight() || 297;
      
      // Top Primary Header Banner
      pdf.setFillColor(79, 70, 229); // Indigo-600
      pdf.rect(0, 0, pageWidth, 40, 'F');
      
      // Header Title text
      pdf.setTextColor(255, 255, 255);
      pdf.setFont("helvetica", "bold");
      pdf.setFontSize(20);
      pdf.text("MESS MANAGER REPORT", 15, 18);
      
      // Header Subtitle text
      pdf.setFont("helvetica", "normal");
      pdf.setFontSize(9.5);
      pdf.text(`Official statement for the month of: ${data.stats.monthName}`, 15, 27);
      pdf.text(`Date of Issue: ${new Date().toLocaleDateString()}`, pageWidth - 65, 27);

      // Summary Section Header
      pdf.setTextColor(30, 41, 59); // Slate-800
      pdf.setFont("helvetica", "bold");
      pdf.setFontSize(13);
      pdf.text("MESS SUMMARY", 15, 52);
      
      // Summary Box
      pdf.setDrawColor(226, 232, 240); // Slate-200
      pdf.setFillColor(248, 250, 252); // Slate-50
      pdf.roundedRect(15, 57, pageWidth - 30, 25, 3, 3, 'FD');
      
      // Summary Items Mapping
      const summaryItems = [
        { label: "TOTAL MEALS", val: data.stats.totalMeals.toFixed(2) },
        { label: "MEAL RATE", val: `${data.stats.mealRate.toFixed(2)} BDT` },
        { label: "TOTAL DEPOSIT", val: `${data.stats.totalDeposit.toFixed(2)} BDT` },
        { label: "TOTAL EXPENSE", val: `${data.stats.totalExpense.toFixed(2)} BDT` },
        { label: "MESS BALANCE", val: `${data.stats.balance.toFixed(2)} BDT` }
      ];
      
      const colWidthSum = (pageWidth - 40) / 5;
      
      summaryItems.forEach((item, index) => {
        pdf.setFont("helvetica", "bold");
        pdf.setFontSize(7.5);
        pdf.setTextColor(100, 116, 139); // Slate-500
        pdf.text(item.label, 20 + (index * colWidthSum), 65);
        
        pdf.setFont("helvetica", "bold");
        pdf.setFontSize(10.5);
        
        if (index === 4) {
          pdf.setTextColor(data.stats.balance >= 0 ? 16 : 225, data.stats.balance >= 0 ? 124 : 29, data.stats.balance >= 0 ? 65 : 72);
        } else if (index === 2) {
          pdf.setTextColor(16, 124, 65); // Emerald-600
        } else if (index === 3) {
          pdf.setTextColor(225, 29, 72); // Rose-600
        } else {
          pdf.setTextColor(30, 41, 59);
        }
        pdf.text(item.val, 20 + (index * colWidthSum), 74);
      });
      
      // Ledger Details Header
      pdf.setTextColor(30, 41, 59);
      pdf.setFont("helvetica", "bold");
      pdf.setFontSize(13);
      pdf.text("MEMBER LEDGER DETAILS", 15, 95);
      
      // Table Columns Config
      const columns = [
        { header: "MEMBER NAME", width: 45 },
        { header: "MEALS", width: 18, align: "center" },
        { header: "MEAL COST", width: 22, align: "right" },
        { header: "JOINT COST", width: 22, align: "right" },
        { header: "SINGLE COST", width: 22, align: "right" },
        { header: "TOTAL COST", width: 22, align: "right" },
        { header: "DEPOSIT", width: 20, align: "right" },
        { header: "BALANCE", width: 22, align: "right" }
      ];
      
      let currentY = 101;
      
      // Draw Table Header Background
      pdf.setFillColor(79, 70, 229); // Indigo-600
      pdf.rect(15, currentY, pageWidth - 30, 8, 'F');
      
      // Draw Headers
      pdf.setTextColor(255, 255, 255);
      pdf.setFont("helvetica", "bold");
      pdf.setFontSize(7.5);
      
      let headerX = 18;
      columns.forEach((col) => {
        if (col.align === "center") {
          pdf.text(col.header, headerX + col.width / 2, currentY + 5.5, { align: "center" });
        } else if (col.align === "right") {
          pdf.text(col.header, headerX + col.width - 2, currentY + 5.5, { align: "right" });
        } else {
          pdf.text(col.header, headerX, currentY + 5.5);
        }
        headerX += col.width;
      });
      
      currentY += 8;
      
      // Draw Table Rows
      pdf.setFont("helvetica", "normal");
      pdf.setFontSize(8);
      
      const activeMembers = data.members.filter((member: any) => member.role !== 'Pending');
      
      activeMembers.forEach((member: any, index: number) => {
        // Alternating row background
        if (index % 2 === 0) {
          pdf.setFillColor(248, 250, 252);
        } else {
          pdf.setFillColor(255, 255, 255);
        }
        pdf.rect(15, currentY, pageWidth - 30, 8.5, 'F');
        
        pdf.setDrawColor(241, 245, 249);
        pdf.line(15, currentY + 8.5, pageWidth - 15, currentY + 8.5);
        
        pdf.setTextColor(51, 65, 85);
        let cellX = 18;
        
        // Name
        const nameVal = member.name.toUpperCase();
        pdf.setFont("helvetica", "bold");
        pdf.text(nameVal, cellX, currentY + 5.5);
        pdf.setFont("helvetica", "normal");
        
        // Meals
        cellX += columns[0].width;
        pdf.text(member.totalMeal.toFixed(1), cellX + columns[1].width / 2, currentY + 5.5, { align: "center" });
        
        // Meal Cost
        cellX += columns[1].width;
        pdf.text(member.mealCost.toFixed(2), cellX + columns[2].width - 2, currentY + 5.5, { align: "right" });
        
        // Joint Cost
        cellX += columns[2].width;
        pdf.text(member.jointCost.toFixed(2), cellX + columns[3].width - 2, currentY + 5.5, { align: "right" });
        
        // Single Cost
        cellX += columns[3].width;
        pdf.text(member.singleCost.toFixed(2), cellX + columns[4].width - 2, currentY + 5.5, { align: "right" });
        
        // Total Cost
        cellX += columns[4].width;
        pdf.setFont("helvetica", "bold");
        pdf.text(member.totalCost.toFixed(2), cellX + columns[5].width - 2, currentY + 5.5, { align: "right" });
        pdf.setFont("helvetica", "normal");
        
        // Deposit
        cellX += columns[5].width;
        pdf.setTextColor(16, 124, 65);
        pdf.text(member.deposit.toFixed(2), cellX + columns[6].width - 2, currentY + 5.5, { align: "right" });
        pdf.setTextColor(51, 65, 85);
        
        // Balance
        cellX += columns[6].width;
        const balVal = member.balance;
        const isPos = balVal >= 0;
        pdf.setFont("helvetica", "bold");
        if (isPos) {
          pdf.setTextColor(16, 124, 65);
          pdf.text(`+${balVal.toFixed(2)}`, cellX + columns[7].width - 2, currentY + 5.5, { align: "right" });
        } else {
          pdf.setTextColor(225, 29, 72);
          pdf.text(`${balVal.toFixed(2)}`, cellX + columns[7].width - 2, currentY + 5.5, { align: "right" });
        }
        pdf.setTextColor(51, 65, 85);
        pdf.setFont("helvetica", "normal");
        
        currentY += 8.5;
        
        // Multi-page handling
        if (currentY > pageHeight - 20) {
          pdf.addPage();
          currentY = 15;
          
          pdf.setFillColor(79, 70, 229);
          pdf.rect(15, currentY, pageWidth - 30, 8, 'F');
          pdf.setTextColor(255, 255, 255);
          pdf.setFont("helvetica", "bold");
          pdf.setFontSize(7.5);
          
          let hX = 18;
          columns.forEach((col) => {
            if (col.align === "center") {
              pdf.text(col.header, hX + col.width / 2, currentY + 5.5, { align: "center" });
            } else if (col.align === "right") {
              pdf.text(col.header, hX + col.width - 2, currentY + 5.5, { align: "right" });
            } else {
              pdf.text(col.header, hX, currentY + 5.5);
            }
            hX += col.width;
          });
          currentY += 8;
          pdf.setFont("helvetica", "normal");
          pdf.setFontSize(8);
        }
      });
      
      // Footer Section
      currentY += 15;
      if (currentY > pageHeight - 20) {
        pdf.addPage();
        currentY = 20;
      }
      
      pdf.setDrawColor(226, 232, 240);
      pdf.line(15, currentY, pageWidth - 15, currentY);
      
      currentY += 6;
      pdf.setFont("helvetica", "italic");
      pdf.setFontSize(7.5);
      pdf.setTextColor(148, 163, 184); // Slate-400
      pdf.text("This is an automatically generated electronic report from Mess Manager Application.", 15, currentY);
      
      pdf.save(`Mess_Report_${data.stats.monthName}.pdf`);
    } catch (error: any) {
      console.error("Error generating PDF:", error);
      alert("পিডিএফ জেনারেট করতে সমস্যা হয়েছে: " + error?.message);
    } finally {
      setDownloading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-[60vh]">
        <Loader2 className="w-10 h-10 animate-spin text-blue-500" />
      </div>
    );
  }

  if (!data?.stats) {
    return (
      <div className="w-full mt-10">
        <div className="bg-white rounded-3xl p-10 text-center shadow-sm border border-gray-100">
          <FileText className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-800 mb-2">কোনো চলমান মাস নেই</h2>
          <p className="text-gray-500">চলমান মাসের কোনো হিসাব পাওয়া যায়নি।</p>
        </div>
      </div>
    );
  }

  const { stats, members } = data;

  return (
    <div className="w-full mt-6 space-y-6">
      
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-center gap-4 bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <FileText className="w-6 h-6 text-blue-500" />
            চলমান মাসের হিসাব
          </h2>
          <p className="text-gray-500 mt-1">মাস: <span className="font-semibold text-gray-700">{stats.monthName}</span></p>
        </div>
        <div className="flex gap-3">
           <button onClick={() => window.print()} className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl font-bold transition-colors flex items-center gap-2">
             <Printer className="w-4 h-4" /> প্রিন্ট
           </button>
           <button 
            onClick={handleDownloadPDF} 
            disabled={downloading}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold transition-colors flex items-center gap-2 disabled:opacity-50"
           >
             {downloading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
             {downloading ? "ডাউনলোড হচ্ছে..." : "পিডিএফ ডাউনলোড"}
           </button>
        </div>
      </div>

      <div ref={reportRef} className="space-y-6 bg-gray-50/50 p-4 rounded-xl">
        {/* Global Summary Table */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
           <div className="bg-gray-50 px-6 py-4 border-b border-gray-200">
             <h3 className="font-bold text-gray-800">মাসের সারসংক্ষেপ (Summary) - {stats.monthName}</h3>
           </div>
           <div className="p-6">
              <div className="grid grid-cols-2 md:grid-cols-5 gap-6">
                <div>
                  <p className="text-sm font-semibold text-gray-500 mb-1">মোট মিল</p>
                  <p className="text-xl font-black text-gray-900">{stats.totalMeals.toFixed(2)}</p>
                </div>
                <div>
                  <p className="text-sm font-semibold text-gray-500 mb-1">মিল রেট</p>
                  <p className="text-xl font-black text-gray-900">{stats.mealRate.toFixed(2)} ৳</p>
                </div>
                <div>
                  <p className="text-sm font-semibold text-gray-500 mb-1">মোট জমা</p>
                  <p className="text-xl font-black text-emerald-600">{stats.totalDeposit.toFixed(2)} ৳</p>
                </div>
                <div>
                  <p className="text-sm font-semibold text-gray-500 mb-1">মোট খরচ</p>
                  <p className="text-xl font-black text-rose-600">{stats.totalExpense.toFixed(2)} ৳</p>
                </div>
                <div>
                  <p className="text-sm font-semibold text-gray-500 mb-1">মেস ব্যালেন্স</p>
                  <p className={cn("text-xl font-black", stats.balance >= 0 ? "text-emerald-600" : "text-rose-600")}>{stats.balance.toFixed(2)} ৳</p>
                </div>
              </div>
           </div>
        </div>

        {/* Detailed Member Table */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="bg-gray-50 px-6 py-4 border-b border-gray-200">
             <h3 className="font-bold text-gray-800">মেম্বারদের বিস্তারিত হিসাব</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-50/50 border-b border-gray-200">
                  <th className="p-4 text-sm font-bold text-gray-500 uppercase whitespace-nowrap">মেম্বারের নাম</th>
                  <th className="p-4 text-sm font-bold text-gray-500 uppercase text-center whitespace-nowrap">মোট মিল</th>
                  <th className="p-4 text-sm font-bold text-gray-500 uppercase text-center whitespace-nowrap">মিল খরচ</th>
                  <th className="p-4 text-sm font-bold text-gray-500 uppercase text-center whitespace-nowrap">যৌথ খরচ</th>
                  <th className="p-4 text-sm font-bold text-gray-500 uppercase text-center whitespace-nowrap">একক খরচ</th>
                  <th className="p-4 text-sm font-bold text-gray-500 uppercase text-center whitespace-nowrap">মোট খরচ</th>
                  <th className="p-4 text-sm font-bold text-gray-500 uppercase text-center whitespace-nowrap">জমা</th>
                  <th className="p-4 text-sm font-bold text-gray-500 uppercase text-right whitespace-nowrap">ব্যালেন্স</th>
                  {(mongoUser?.role === 'Manager' || mongoUser?.role === 'Super Admin') && (
                    <th className="p-4 text-sm font-bold text-gray-500 uppercase text-center whitespace-nowrap">অ্যাকশন</th>
                  )}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {members.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="p-8 text-center text-gray-500">কোনো মেম্বার নেই।</td>
                  </tr>
                ) : (
                  members.map((member: any) => (
                    <tr key={member._id} className="hover:bg-gray-50/50 transition-colors">
                      <td className="p-4 text-sm font-black text-gray-900 uppercase whitespace-nowrap">{member.name}</td>
                      <td className="p-4 text-sm font-bold text-gray-700 text-center">{member.totalMeal.toFixed(2)}</td>
                      <td className="p-4 text-sm font-bold text-gray-700 text-center">{member.mealCost.toFixed(2)} ৳</td>
                      <td className="p-4 text-sm font-bold text-gray-700 text-center">{member.jointCost.toFixed(2)} ৳</td>
                      <td className="p-4 text-sm font-bold text-gray-700 text-center">{member.singleCost.toFixed(2)} ৳</td>
                      <td className="p-4 text-sm font-black text-rose-600 text-center bg-rose-50/30">{member.totalCost.toFixed(2)} ৳</td>
                      <td className="p-4 text-sm font-black text-emerald-600 text-center bg-emerald-50/30">{member.deposit.toFixed(2)} ৳</td>
                      <td className={cn("p-4 text-sm font-black text-right", member.balance >= 0 ? 'text-emerald-600' : 'text-rose-600')}>
                        {member.balance > 0 ? '+' : ''}{member.balance.toFixed(2)} ৳
                      </td>
                      {(mongoUser?.role === 'Manager' || mongoUser?.role === 'Super Admin') && (
                        <td className="p-4 text-center">
                          <button
                            onClick={() => handleRemoveMember(member)}
                            className="p-2 bg-rose-50 text-rose-500 hover:bg-rose-100 rounded-lg transition-colors"
                            title="মেম্বার রিমুভ করুন"
                          >
                            <Trash2 className="w-5 h-5" />
                          </button>
                        </td>
                      )}
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
      
      <div className="mt-8 border-t border-gray-200 pt-8">
        <LedgerTable />
      </div>

    </div>
  );
}
