"use client";

import { useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { CalendarPlus, Loader2 } from 'lucide-react';
import { createNewMonthSheet } from '@/app/actions/sheetActions';

export default function NewMonthPage() {
  const { mongoUser } = useAuth();
  const [monthName, setMonthName] = useState('');
  const [startDate, setStartDate] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [carryOverBalance, setCarryOverBalance] = useState(false);

  if (mongoUser?.role !== 'Super Admin' && mongoUser?.role !== 'Manager') {
    return <div className="p-6 text-center text-red-500">You do not have permission to access this page.</div>;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage('');
    setError('');

    try {
      const res = await createNewMonthSheet(monthName, new Date(startDate), carryOverBalance);
      if (res.success) {
        setMessage(`সফলভাবে "${monthName}" মাস তৈরি করা হয়েছে!`);
        setMonthName('');
        setStartDate('');
        setCarryOverBalance(false);
      } else {
        setError(res.error || 'মাস তৈরি করতে সমস্যা হয়েছে।');
      }
    } catch (err: any) {
      setError(err.message || 'Error occurred');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full mt-10">
      <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-8">
        <div className="bg-gradient-to-r from-purple-600 to-indigo-600 p-8 text-center rounded-2xl mb-8">
          <div className="mx-auto bg-white/20 w-16 h-16 rounded-full flex items-center justify-center mb-4">
            <CalendarPlus className="w-8 h-8 text-white" />
          </div>
          <h2 className="text-3xl font-bold text-white">নতুন মাস শুরু করুন</h2>
          <p className="text-purple-100 mt-2">আপনার ডাটাবেজে একটি নতুন মাস তৈরি হবে</p>
        </div>
        
        <div className="p-8">
          {message && <div className="bg-emerald-50 text-emerald-600 p-4 rounded-xl text-sm mb-6 border border-emerald-100 font-medium">{message}</div>}
          {error && <div className="bg-red-50 text-red-600 p-4 rounded-xl text-sm mb-6 border border-red-100 font-medium">{error}</div>}
          
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">মাসের নাম</label>
              <input
                type="text"
                required
                value={monthName}
                onChange={(e) => setMonthName(e.target.value)}
                className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-all outline-none"
                placeholder="যেমন: June 26"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">শুরুর তারিখ</label>
              <input
                type="date"
                required
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-all outline-none"
              />
            </div>

            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-2xl border border-gray-150">
              <div>
                <label className="block text-sm font-bold text-gray-700">ব্যালেন্স ক্যারি-ওভার করুন</label>
                <p className="text-[10px] text-gray-400 font-semibold mt-0.5">সব মেম্বারের আগের মাসের অবশিষ্ট ব্যালেন্স নতুন মাসে স্থানান্তর করতে চান?</p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input 
                  type="checkbox" 
                  checked={carryOverBalance} 
                  onChange={(e) => setCarryOverBalance(e.target.checked)} 
                  className="sr-only peer" 
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-purple-600"></div>
              </label>
            </div>
            
            <button
              type="submit"
              disabled={loading}
              className="w-full flex justify-center items-center gap-2 py-3.5 bg-purple-600 hover:bg-purple-700 text-white rounded-xl font-medium transition-colors shadow-md shadow-purple-200 disabled:opacity-70"
            >
              {loading && <Loader2 className="w-5 h-5 animate-spin" />}
              {loading ? 'মাস তৈরি করা হচ্ছে...' : 'নতুন মাস তৈরি করুন'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
