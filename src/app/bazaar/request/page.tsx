"use client";

import { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { Calendar, Loader2, Send } from 'lucide-react';
import { requestBazaarSchedule, getBazaarSchedules } from '@/app/actions/bazaarActions';
import { useRouter } from 'next/navigation';

export default function RequestBazaarPage() {
  const { mongoUser } = useAuth();
  const router = useRouter();
  
  const [fromDate, setFromDate] = useState(new Date().toISOString().split('T')[0]);
  const [toDate, setToDate] = useState(new Date().toISOString().split('T')[0]);
  
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  
  const [hasPending, setHasPending] = useState(false);

  useEffect(() => {
    async function checkExisting() {
      if (!mongoUser) return;
      const res = await getBazaarSchedules();
      if (res.success && res.schedules) {
        const pending = res.schedules.find((s: any) => s.userId._id === mongoUser._id && s.status === 'Pending');
        if (pending) setHasPending(true);
      }
      setFetching(false);
    }
    checkExisting();
  }, [mongoUser]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!mongoUser) return;

    if (new Date(fromDate) > new Date(toDate)) {
      setError('শুরুর তারিখ শেষের তারিখের চেয়ে বড় হতে পারে না।');
      return;
    }

    setLoading(true);
    setMessage('');
    setError('');

    try {
      const res = await requestBazaarSchedule(mongoUser._id, new Date(fromDate), new Date(toDate));
      if (res.success) {
        setMessage('আপনার বাজারের তারিখের রিকোয়েস্ট ম্যানেজারের কাছে পাঠানো হয়েছে।');
        setHasPending(true);
      } else {
        setError(res.error || 'রিকোয়েস্ট পাঠাতে সমস্যা হয়েছে।');
      }
    } catch (err: any) {
      setError(err.message || 'Error occurred');
    } finally {
      setLoading(false);
    }
  };

  if (fetching) {
    return <div className="flex justify-center p-10"><Loader2 className="w-8 h-8 animate-spin text-indigo-500" /></div>;
  }

  return (
    <div className="w-full mt-4 space-y-6">
      <div className="bg-white rounded-3xl p-8 shadow-sm border border-gray-100 flex items-center gap-4">
        <div className="w-14 h-14 bg-indigo-50 text-indigo-500 rounded-2xl flex items-center justify-center">
          <Calendar className="w-7 h-7" />
        </div>
        <div>
          <h2 className="text-2xl font-bold text-gray-900">বাজারের রিকোয়েস্ট</h2>
          <p className="text-gray-500 mt-1">ম্যানেজারের কাছে আপনার বাজারের ডেট রিকোয়েস্ট করুন</p>
        </div>
      </div>
      
      {message && <div className="bg-emerald-50 text-emerald-600 p-4 rounded-xl text-sm border border-emerald-100 font-bold">{message}</div>}
      {error && <div className="bg-red-50 text-red-600 p-4 rounded-xl text-sm border border-red-100 font-bold">{error}</div>}
      
      {hasPending ? (
        <div className="bg-white rounded-3xl shadow-sm border border-amber-100 p-10 text-center flex flex-col items-center">
          <div className="w-20 h-20 bg-amber-50 text-amber-500 rounded-full flex items-center justify-center mb-6">
             <Loader2 className="w-10 h-10 animate-spin" />
          </div>
          <h3 className="text-2xl font-bold text-gray-900 mb-2">রিকোয়েস্ট পেন্ডিং আছে</h3>
          <p className="text-gray-500 mb-8 max-w-md">আপনি ইতোমধ্যে একটি রিকোয়েস্ট করেছেন যা ম্যানেজারের অ্যাপ্রুভালের অপেক্ষায় আছে। দয়া করে অপেক্ষা করুন।</p>
          <button 
            onClick={() => router.push('/')}
            className="px-8 py-3 bg-gray-900 hover:bg-gray-800 text-white font-bold rounded-xl"
          >
            হোমপেজে ফিরে যান
          </button>
        </div>
      ) : (
        <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-8 w-full">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">শুরুর তারিখ (From Date)</label>
                <input
                  type="date"
                  required
                  value={fromDate}
                  onChange={(e) => setFromDate(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-indigo-500 font-medium outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">শেষের তারিখ (To Date)</label>
                <input
                  type="date"
                  required
                  value={toDate}
                  onChange={(e) => setToDate(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-indigo-500 font-medium outline-none"
                />
              </div>
            </div>
            
            <div className="pt-4">
              <button
                type="submit"
                disabled={loading}
                className="w-full flex justify-center items-center gap-2 py-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold transition-all shadow-md shadow-indigo-200 disabled:opacity-70"
              >
                {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
                {loading ? 'পাঠানো হচ্ছে...' : 'রিকোয়েস্ট পাঠান'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
