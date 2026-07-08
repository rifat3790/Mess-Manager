"use client";

import { useAuth } from '@/context/AuthContext';
import { Files, Loader2, Download, Printer } from 'lucide-react';
import { useEffect, useState } from 'react';
import { getAllMonthsReportData } from '@/app/actions/dataActions';
import { cn } from '@/lib/utils';

export default function AllReportsPage() {
  const { mongoUser } = useAuth();
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    const fetchData = async () => {
      if (!mongoUser?._id) return;
      const res = await getAllMonthsReportData(mongoUser._id);
      if (res.success) {
        setData(res.data);
      }
      setLoading(false);
    };
    if (mongoUser) {
      fetchData();
    }
  }, [mongoUser]);

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-[60vh]">
        <Loader2 className="w-10 h-10 animate-spin text-blue-500" />
      </div>
    );
  }

  if (data.length === 0) {
    return (
      <div className="w-full mt-10">
        <div className="bg-white rounded-3xl p-10 text-center shadow-sm border border-gray-100">
          <Files className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-800 mb-2">কোনো হিসাব পাওয়া যায়নি</h2>
          <p className="text-gray-500">ডাটাবেসে কোনো মাসের হিসাব সংরক্ষিত নেই।</p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full mt-6 space-y-10 mb-12">
      
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-center gap-4 bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Files className="w-6 h-6 text-indigo-500" />
            সকল মাসের হিসাব (আর্কাইভ)
          </h2>
          <p className="text-gray-500 mt-1">আগের সকল মাসের বিস্তারিত হিসাব নিচে দেওয়া হলো</p>
        </div>
        <div className="flex gap-3">
           <button onClick={() => window.print()} className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg font-medium transition-colors flex items-center gap-2">
             <Printer className="w-4 h-4" /> প্রিন্ট
           </button>
        </div>
      </div>

      {data.map((monthData, index) => {
        const { month, members } = monthData;
        return (
          <div key={index} className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden print:break-after-page">
            <div className="bg-indigo-50 px-6 py-4 border-b border-indigo-100 flex justify-between items-center">
              <h3 className="font-bold text-indigo-900 text-lg">{month.monthName} {month.isActive ? '(চলমান)' : ''}</h3>
              <div className="text-sm font-medium text-indigo-700">
                 মিল রেট: {month.mealRate.toFixed(2)} ৳
              </div>
            </div>
            
            {/* Summary Strip */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-6 bg-gray-50/50 border-b border-gray-100">
               <div>
                 <p className="text-xs text-gray-500">মোট মিল</p>
                 <p className="font-bold text-gray-900">{month.totalMeals.toFixed(2)}</p>
               </div>
               <div>
                 <p className="text-xs text-gray-500">মোট জমা</p>
                 <p className="font-bold text-teal-600">{month.totalDeposit.toFixed(2)} ৳</p>
               </div>
               <div>
                 <p className="text-xs text-gray-500">মোট খরচ</p>
                 <p className="font-bold text-rose-600">{month.totalExpense.toFixed(2)} ৳</p>
               </div>
               <div>
                 <p className="text-xs text-gray-500">মেস ব্যালেন্স</p>
                 <p className={cn("font-bold", month.balance >= 0 ? "text-teal-600" : "text-rose-600")}>{month.balance.toFixed(2)} ৳</p>
               </div>
            </div>

            {/* Members Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-white border-b border-gray-200">
                    <th className="p-4 text-xs font-semibold text-gray-500 uppercase">মেম্বার</th>
                    <th className="p-4 text-xs font-semibold text-gray-500 uppercase text-center">মিল</th>
                    <th className="p-4 text-xs font-semibold text-gray-500 uppercase text-center">মিল খরচ</th>
                    <th className="p-4 text-xs font-semibold text-gray-500 uppercase text-center">যৌথ খরচ</th>
                    <th className="p-4 text-xs font-semibold text-gray-500 uppercase text-center">একক খরচ</th>
                    <th className="p-4 text-xs font-semibold text-gray-500 uppercase text-center">মোট খরচ</th>
                    <th className="p-4 text-xs font-semibold text-gray-500 uppercase text-center">জমা</th>
                    <th className="p-4 text-xs font-semibold text-gray-500 uppercase text-right">ব্যালেন্স</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {members.map((member: any) => (
                    <tr key={member._id} className="hover:bg-gray-50 transition-colors">
                      <td className="p-4 text-sm font-bold text-gray-900 uppercase">{member.name}</td>
                      <td className="p-4 text-sm text-gray-700 text-center">{member.totalMeal.toFixed(2)}</td>
                      <td className="p-4 text-sm text-gray-700 text-center">{member.mealCost.toFixed(2)}</td>
                      <td className="p-4 text-sm text-gray-700 text-center">{member.jointCost.toFixed(2)}</td>
                      <td className="p-4 text-sm text-gray-700 text-center">{member.singleCost.toFixed(2)}</td>
                      <td className="p-4 text-sm font-semibold text-rose-600 text-center bg-rose-50/20">{member.totalCost.toFixed(2)}</td>
                      <td className="p-4 text-sm font-semibold text-teal-600 text-center bg-teal-50/20">{member.deposit.toFixed(2)}</td>
                      <td className={cn("p-4 text-sm font-bold text-right", member.balance >= 0 ? 'text-teal-600' : 'text-rose-600')}>
                        {member.balance > 0 ? '+' : ''}{member.balance.toFixed(2)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        );
      })}

    </div>
  );
}
