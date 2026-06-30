"use client";

import { useState, useEffect } from 'react';
import { useAuth, MongoUser } from '@/context/AuthContext';
import { ShoppingBag, Loader2, Check, Sparkles, Plus, Info, Landmark } from 'lucide-react';
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

  // Suggested tags for easy expense insertion
  const expenseSuggestions = [
    "চাল, ডাল, তেল",
    "মুরগির মাংস",
    "সবজি ও মশলা",
    "ডিম ও আলু",
    "মাছ ও তরকারি",
    "গ্যাস সিলিন্ডার",
    "খাবারের পানি",
    "মেস খালা বিল",
    "কারেন্ট বিল",
    "ওয়াইফাই বিল"
  ];

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
    return <div className="p-6 text-center text-red-500 font-bold">আপনার এই পেজটি দেখার পারমিশন নেই।</div>;
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
      
      const res = await addExpense(
        activeMonth._id, 
        targetUserId, 
        type, 
        Number(amount), 
        description, 
        new Date(date), 
        targetSharedBetween
      );
      
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

  // Shared cost live calculation
  const getSplitCostPreview = () => {
    const amt = Number(amount) || 0;
    const count = sharedBetween.length;
    if (count === 0) return 0;
    return (amt / count).toFixed(2);
  };

  if (fetching) {
    return (
      <div className="flex flex-col justify-center items-center min-h-[60vh]">
        <Loader2 className="w-12 h-12 animate-spin text-rose-500 mb-4" />
        <p className="text-gray-500 font-medium">লোড হচ্ছে...</p>
      </div>
    );
  }

  return (
    <div suppressHydrationWarning className="w-full mt-2 space-y-6 pb-16">
      
      {/* Header Widget */}
      <div className="bg-gradient-to-r from-rose-50 to-pink-50 rounded-3xl p-6 border border-rose-100 flex items-center gap-5 shadow-[0_8px_30px_rgb(244,63,94,0.02)]">
        <div className="w-14 h-14 bg-gradient-to-br from-rose-500 to-pink-500 text-white rounded-2xl flex items-center justify-center shadow-md shadow-rose-200">
          <ShoppingBag className="w-7 h-7" />
        </div>
        <div>
          <h2 className="text-2xl font-black text-gray-900 tracking-tight">খরচ যুক্ত করুন (অ্যাডমিন প্যানেল)</h2>
          <p className="text-gray-500 mt-0.5 text-xs font-semibold">
            চলমান মাস: <span className="text-rose-600 bg-rose-100/50 px-2 py-0.5 rounded font-black">{activeMonth?.name || 'কোনো মাস শুরু হয়নি'}</span>
          </p>
        </div>
      </div>

      <div className="bg-white rounded-3xl shadow-sm border border-gray-150 p-6 md:p-8">
        <form onSubmit={handleSubmit} className="space-y-6">
          
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            {/* Expense Type Select */}
            <div>
              <label className="block text-xs font-bold text-gray-500 mb-2 uppercase tracking-wide">খরচের ধরন</label>
              <select
                required
                value={type}
                onChange={(e) => setType(e.target.value as any)}
                className="w-full px-4 py-3 bg-gray-50/50 rounded-xl border border-gray-200 focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 font-bold text-sm text-gray-800 outline-none transition-all"
              >
                <option value="Meal">🍳 বাজার খরচ (মিল সম্পর্কিত)</option>
                <option value="Joint">🤝 যৌথ খরচ (সবার মাঝে বন্টন)</option>
                <option value="Single">👤 ব্যক্তিগত খরচ (একজনের একক খরচ)</option>
              </select>
            </div>
            
            {/* Single User Select */}
            {type === 'Single' && (
              <div>
                <label className="block text-xs font-bold text-gray-500 mb-2 uppercase tracking-wide">মেম্বার (যিনি খরচ করেছেন)</label>
                <select
                  required
                  value={userId}
                  onChange={(e) => setUserId(e.target.value)}
                  className="w-full px-4 py-3 bg-gray-50/50 rounded-xl border border-gray-200 focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 font-bold text-sm text-gray-800 outline-none transition-all"
                >
                  {members.map(m => (
                    <option key={m._id} value={m._id}>{m.name}</option>
                  ))}
                </select>
              </div>
            )}
          </div>
          
          {/* Joint Expense Members Select Box */}
          {type === 'Joint' && (
            <div className="border border-rose-100 rounded-2xl p-5 bg-rose-50/20 space-y-4">
              <div className="flex items-center justify-between">
                <label className="block text-xs font-bold text-gray-600 uppercase tracking-wide">যাদের মাঝে খরচ শেয়ার হবে (মেম্বার সিলেক্ট করুন):</label>
                <button 
                  type="button" 
                  onClick={toggleAllSharedUsers}
                  className="text-xs font-black text-rose-600 hover:underline"
                >
                  {sharedBetween.length === members.length ? 'সবাইকে আনসিলেক্ট করুন' : 'সবাইকে সিলেক্ট করুন'}
                </button>
              </div>
              <div className="flex flex-wrap gap-2.5">
                {members.map(m => {
                  const isChecked = sharedBetween.includes(m._id);
                  return (
                    <button
                      key={m._id}
                      type="button"
                      onClick={() => toggleSharedUser(m._id)}
                      className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition-all border ${
                        isChecked 
                        ? 'bg-rose-600 border-rose-600 text-white shadow-md shadow-rose-100' 
                        : 'bg-white border-gray-200 text-gray-600 hover:border-rose-300 hover:bg-rose-50/50'
                      }`}
                    >
                      {isChecked && <Check className="w-3.5 h-3.5" />}
                      {m.name}
                    </button>
                  );
                })}
              </div>

              {/* Dynamic split preview card */}
              {sharedBetween.length > 0 && amount && Number(amount) > 0 && (
                <div className="bg-white border border-rose-100 p-4 rounded-xl flex items-center justify-between gap-4 mt-3 shadow-sm">
                  <div className="flex items-center gap-2 text-rose-700">
                    <Landmark className="w-4 h-4" />
                    <span className="text-xs font-extrabold">খরচ বিভাজন সামারি:</span>
                  </div>
                  <div className="text-right text-xs">
                    <span className="text-gray-500 font-bold">জনপ্রতি খরচ: </span>
                    <span className="text-sm font-black text-rose-600 bg-rose-50 px-2 py-0.5 rounded border border-rose-100/50 ml-1">
                      {getSplitCostPreview()} ৳
                    </span>
                    <span className="text-gray-400 font-bold ml-1">({sharedBetween.length} জনের মধ্যে)</span>
                  </div>
                </div>
              )}
            </div>
          )}
          
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            {/* Date Input */}
            <div>
              <label className="block text-xs font-bold text-gray-500 mb-2 uppercase tracking-wide">তারিখ</label>
              <input
                type="date"
                required
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full px-4 py-3 bg-gray-50/50 rounded-xl border border-gray-200 focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 font-bold text-sm text-gray-800 outline-none transition-all"
              />
            </div>
            
            {/* Amount Input */}
            <div>
              <label className="block text-xs font-bold text-gray-500 mb-2 uppercase tracking-wide">টাকার পরিমাণ</label>
              <input
                type="number"
                min="1"
                required
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="w-full px-4 py-3 bg-gray-50/50 rounded-xl border border-gray-200 focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 font-bold text-sm text-gray-800 outline-none transition-all"
                placeholder="যেমন: 500"
              />
            </div>
          </div>

          {/* Description Input */}
          <div>
            <label className="block text-xs font-bold text-gray-500 mb-2 uppercase tracking-wide">খরচের বিবরণ</label>
            <input
              type="text"
              required
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full px-4 py-3 bg-gray-50/50 rounded-xl border border-gray-200 focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 font-bold text-sm text-gray-800 outline-none transition-all"
              placeholder="যেমন: চাল, ডাল, আলু"
            />
          </div>

          {/* Description Auto Suggestions Chips */}
          <div className="space-y-2">
            <span className="block text-[11px] font-bold text-gray-400 uppercase tracking-wide flex items-center gap-1">
              <Sparkles className="w-3.5 h-3.5 text-rose-500 animate-pulse" />
              সহজে খরচের বিবরণ লিখুন (অটো সাজেস্ট):
            </span>
            <div className="flex flex-wrap gap-2">
              {expenseSuggestions.map(tag => (
                <button
                  key={tag}
                  type="button"
                  onClick={() => setDescription(tag)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-all ${
                    description === tag 
                    ? 'bg-rose-50 border-rose-300 text-rose-600 font-black' 
                    : 'bg-gray-50/50 border-gray-200 text-gray-600 hover:bg-rose-50/30 hover:border-rose-200'
                  }`}
                >
                  + {tag}
                </button>
              ))}
            </div>
          </div>
          
          {/* Submit Button */}
          <div className="pt-4">
            <button
              type="submit"
              disabled={loading || !activeMonth}
              className="w-full flex justify-center items-center gap-2 py-4 bg-gradient-to-r from-rose-500 to-pink-500 hover:from-rose-600 hover:to-pink-600 text-white rounded-2xl font-bold transition-all shadow-md shadow-rose-200/50 disabled:opacity-70 text-sm"
            >
              {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Landmark className="w-5 h-5" />}
              {loading ? 'যুক্ত হচ্ছে...' : 'খরচ যুক্ত করুন'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
