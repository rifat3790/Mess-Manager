"use client";

import { useState, useEffect } from 'react';
import { useAuth, MongoUser } from '@/context/AuthContext';
import { Wallet, Loader2 } from 'lucide-react';
import { getActiveMonth, getMembers, addDeposit } from '@/app/actions/dataActions';
import { toast } from 'react-hot-toast';

export default function DepositPage() {
  const { mongoUser } = useAuth();
  const [members, setMembers] = useState<MongoUser[]>([]);
  const [activeMonth, setActiveMonth] = useState<any>(null);
  
  const [userId, setUserId] = useState('');
  const [amount, setAmount] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);

  useEffect(() => {
    fetchInitialData();
  }, []);

  const fetchInitialData = async () => {
    try {
      const [monthRes, membersRes] = await Promise.all([
        getActiveMonth(),
        getMembers()
      ]);

      if (monthRes.success) setActiveMonth(monthRes.month);
      if (membersRes.success) {
        setMembers(membersRes.users);
        if (membersRes.users.length > 0) setUserId(membersRes.users[0]._id);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setFetching(false);
    }
  };

  if (mongoUser?.role !== 'Super Admin' && mongoUser?.role !== 'Manager') {
    return <div className="p-6 text-center text-red-500">You do not have permission to access this page.</div>;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeMonth) {
      toast.error('কোনো চলমান মাস পাওয়া যায়নি। আগে নতুন মাস শুরু করুন।');
      return;
    }

    setLoading(true);

    try {
      const res = await addDeposit(activeMonth._id, userId, Number(amount), new Date(date));
      if (res.success) {
        toast.success('টাকা জমা সফলভাবে যুক্ত হয়েছে এবং গুগল শিটে আপডেট হয়েছে!');
        setAmount('');
      } else {
        toast.error(res.error || 'জমা যুক্ত করতে সমস্যা হয়েছে।');
      }
    } catch (err: any) {
      toast.error(err.message || 'Error occurred');
    } finally {
      setLoading(false);
    }
  };

  if (fetching) {
    return <div className="flex justify-center p-10"><Loader2 className="w-8 h-8 animate-spin text-blue-500" /></div>;
  }

  return (
    <div className="w-full mt-10">
      <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-8">
        <div className="bg-gradient-to-r from-teal-500 to-emerald-600 p-8 text-center">
          <div className="mx-auto bg-white/20 w-16 h-16 rounded-full flex items-center justify-center mb-4">
            <Wallet className="w-8 h-8 text-white" />
          </div>
          <h2 className="text-3xl font-bold text-white">টাকা জমা করুন</h2>
          <p className="text-teal-50 mt-2">বর্তমান মাস: {activeMonth?.name || 'কোনো মাস শুরু হয়নি'}</p>
        </div>
        
        <div className="p-8">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">মেম্বার নির্বাচন করুন</label>
              <select
                required
                value={userId}
                onChange={(e) => setUserId(e.target.value)}
                className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-teal-500 focus:border-teal-500 transition-all outline-none"
              >
                {members.map(m => (
                  <option key={m._id} value={m._id}>{m.name}</option>
                ))}
              </select>
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">তারিখ</label>
                <input
                  type="date"
                  required
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-teal-500 focus:border-teal-500 transition-all outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">টাকার পরিমাণ</label>
                <input
                  type="number"
                  required
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-teal-500 focus:border-teal-500 transition-all outline-none"
                  placeholder="যেমন: 2000"
                />
              </div>
            </div>
            
            <button
              type="submit"
              disabled={loading || !activeMonth}
              className="w-full flex justify-center items-center gap-2 py-3.5 bg-teal-600 hover:bg-teal-700 text-white rounded-xl font-medium transition-colors shadow-md shadow-teal-200 disabled:opacity-70"
            >
              {loading && <Loader2 className="w-5 h-5 animate-spin" />}
              {loading ? 'যুক্ত হচ্ছে...' : 'জমা করুন'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
