"use client";

import { useState, useEffect } from 'react';
import { useAuth, MongoUser } from '@/context/AuthContext';
import { ShoppingBag, Loader2, Check } from 'lucide-react';
import { getActiveMonth, getMembers, addExpense } from '@/app/actions/dataActions';
import { toast } from 'react-hot-toast';

export default function ExpensePage() {
  const { mongoUser } = useAuth();
  const [members, setMembers] = useState<MongoUser[]>([]);
  const [activeMonth, setActiveMonth] = useState<any>(null);
  
  const [type, setType] = useState<'Meal' | 'Joint' | 'Single'>('Meal');
  const [userId, setUserId] = useState('');
  
  // Array to store selected users for shared cost
  const [sharedBetween, setSharedBetween] = useState<string[]>([]);
  
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
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
        if (membersRes.users.length > 0) {
          setUserId(membersRes.users[0]._id);
          // By default select all members for shared cost
          setSharedBetween(membersRes.users.map((m: any) => m._id));
        }
      }
    } catch (err) {
      console.error(err);
    } finally {
      setFetching(false);
    }
  };

  const toggleSharedUser = (id: string) => {
    setSharedBetween(prev => 
      prev.includes(id) ? prev.filter(u => u !== id) : [...prev, id]
    );
  };
  
  const toggleAllSharedUsers = () => {
    if (sharedBetween.length === members.length) {
      setSharedBetween([]);
    } else {
      setSharedBetween(members.map(m => m._id));
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

    if (type === 'Joint' && sharedBetween.length === 0) {
      toast.error('অনুগ্রহ করে অন্তত একজন মেম্বার সিলেক্ট করুন যার সাথে খরচ শেয়ার হবে।');
      return;
    }

    setLoading(true);

    try {
      const targetUserId = type === 'Single' ? userId : null;
      const targetSharedBetween = type === 'Joint' ? sharedBetween : [];
      
      const res = await addExpense(activeMonth._id, targetUserId, type, Number(amount), description, new Date(date), targetSharedBetween);
      
      if (res.success) {
        toast.success('খরচ সফলভাবে যুক্ত হয়েছে এবং গুগল শিটে আপডেট হয়েছে!');
        setAmount('');
        setDescription('');
      } else {
        toast.error(res.error || 'খরচ যুক্ত করতে সমস্যা হয়েছে।');
      }
    } catch (err: any) {
      toast.error(err.message || 'Error occurred');
    } finally {
      setLoading(false);
    }
  };

  if (fetching) {
    return <div className="flex justify-center p-10"><Loader2 className="w-8 h-8 animate-spin text-rose-500" /></div>;
  }

  return (
    <div className="w-full mt-4 space-y-6">
      <div className="bg-white rounded-3xl p-8 shadow-sm border border-gray-100 flex items-center gap-4">
        <div className="w-14 h-14 bg-rose-50 text-rose-500 rounded-2xl flex items-center justify-center">
          <ShoppingBag className="w-7 h-7" />
        </div>
        <div>
          <h2 className="text-2xl font-bold text-gray-900">খরচ যুক্ত করুন</h2>
          <p className="text-gray-500 mt-1">চলমান মাস: <span className="font-bold text-gray-800">{activeMonth?.name || 'কোনো মাস শুরু হয়নি'}</span></p>
        </div>
      </div>
      
      <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden p-8">
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2">খরচের ধরন</label>
              <select
                required
                value={type}
                onChange={(e) => setType(e.target.value as any)}
                className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-rose-500 font-medium outline-none"
              >
                <option value="Meal">বাজার খরচ (মিল)</option>
                <option value="Joint">যৌথ খরচ (সবার)</option>
                <option value="Single">ব্যক্তিগত খরচ (একজনের)</option>
              </select>
            </div>
            
            {type === 'Single' && (
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">মেম্বার (যিনি খরচ করেছেন)</label>
                <select
                  required
                  value={userId}
                  onChange={(e) => setUserId(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-rose-500 font-medium outline-none"
                >
                  {members.map(m => (
                    <option key={m._id} value={m._id}>{m.name}</option>
                  ))}
                </select>
              </div>
            )}
          </div>
          
          {type === 'Joint' && (
            <div className="border border-rose-100 rounded-2xl p-6 bg-rose-50/30">
              <div className="flex items-center justify-between mb-4">
                <label className="block text-sm font-bold text-gray-700">যাদের মাঝে খরচ শেয়ার হবে:</label>
                <button 
                  type="button" 
                  onClick={toggleAllSharedUsers}
                  className="text-sm font-bold text-rose-600 hover:text-rose-700 transition-colors"
                >
                  {sharedBetween.length === members.length ? 'সবাইকে আনসিলেক্ট করুন' : 'সবাইকে সিলেক্ট করুন'}
                </button>
              </div>
              <div className="flex flex-wrap gap-3">
                {members.map(m => (
                  <button
                    key={m._id}
                    type="button"
                    onClick={() => toggleSharedUser(m._id)}
                    className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-all ${
                      sharedBetween.includes(m._id) 
                      ? 'bg-rose-500 text-white shadow-md shadow-rose-200 border border-rose-500' 
                      : 'bg-white text-gray-600 border border-gray-200 hover:border-rose-300 hover:bg-rose-50'
                    }`}
                  >
                    {sharedBetween.includes(m._id) && <Check className="w-4 h-4" />}
                    {m.name}
                  </button>
                ))}
              </div>
            </div>
          )}
          
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2">তারিখ</label>
              <input
                type="date"
                required
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-rose-500 font-medium outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2">টাকার পরিমাণ</label>
              <input
                type="number"
                min="1"
                required
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-rose-500 font-medium outline-none"
                placeholder="যেমন: 500"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-bold text-gray-700 mb-2">খরচের বিবরণ</label>
            <input
              type="text"
              required
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-rose-500 font-medium outline-none"
              placeholder="যেমন: চাল, ডাল, আলু"
            />
          </div>
          
          <div className="pt-4">
            <button
              type="submit"
              disabled={loading || !activeMonth}
              className="w-full flex justify-center items-center gap-2 py-4 bg-rose-600 hover:bg-rose-700 text-white rounded-xl font-bold transition-all shadow-md shadow-rose-200 disabled:opacity-70"
            >
              {loading && <Loader2 className="w-5 h-5 animate-spin" />}
              {loading ? 'যুক্ত হচ্ছে...' : 'খরচ যুক্ত করুন'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
