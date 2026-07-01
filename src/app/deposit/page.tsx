"use client";

import { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { 
  Wallet, 
  Loader2, 
  User, 
  Calendar, 
  ArrowRight, 
  Coins, 
  TrendingUp, 
  AlertCircle, 
  CheckCircle2
} from 'lucide-react';
import { getActiveMonth, getDashboardData, addDeposit } from '@/app/actions/dataActions';
import { toast } from 'react-hot-toast';
import { cn } from '@/lib/utils';

export default function DepositPage() {
  const { mongoUser } = useAuth();
  const [members, setMembers] = useState<any[]>([]);
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
      const [monthRes, dashboardRes] = await Promise.all([
        getActiveMonth(),
        getDashboardData()
      ]);

      if (monthRes.success) setActiveMonth(monthRes.month);
      if (dashboardRes.success && dashboardRes.members) {
        setMembers(dashboardRes.members);
        if (dashboardRes.members.length > 0) setUserId(dashboardRes.members[0]._id);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setFetching(false);
    }
  };

  if (mongoUser?.role !== 'Super Admin' && mongoUser?.role !== 'Manager') {
    return <div className="p-6 text-center text-red-500 font-bold">You do not have permission to access this page.</div>;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeMonth) {
      toast.error('কোনো চলমান মাস পাওয়া যায়নি। আগে নতুন মাস শুরু করুন।');
      return;
    }

    if (!amount || isNaN(Number(amount))) {
      toast.error('সঠিক টাকার পরিমাণ দিন।');
      return;
    }

    setLoading(true);

    try {
      const res = await addDeposit(activeMonth._id, userId, Number(amount), new Date(date));
      if (res.success) {
        toast.success('টাকা জমা সফলভাবে যুক্ত হয়েছে!');
        setAmount('');
        // Refresh dashboard data to update the preview card
        const dashboardRes = await getDashboardData();
        if (dashboardRes.success && dashboardRes.members) {
          setMembers(dashboardRes.members);
        }
      } else {
        toast.error(res.error || 'জমা যুক্ত করতে সমস্যা হয়েছে।');
      }
    } catch (err: any) {
      toast.error(err.message || 'Error occurred');
    } finally {
      setLoading(false);
    }
  };

  // Quick amount helper
  const handleQuickAmount = (val: number) => {
    setAmount(val.toString());
  };

  // Find currently selected member details
  const selectedMember = members.find(m => m._id === userId);

  if (fetching) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh]">
        <Loader2 className="w-12 h-12 text-teal-600 animate-spin mb-4" />
        <p className="text-gray-500 font-medium">তথ্য লোড হচ্ছে...</p>
      </div>
    );
  }

  return (
    <div className="w-full mt-8 pb-16">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        
        {/* Left Column: Form Card (7 columns) */}
        <div className="lg:col-span-7 bg-white rounded-[2.5rem] shadow-[0_12px_40px_rgb(0,0,0,0.02)] border border-gray-100 overflow-hidden">
          {/* Header decoration */}
          <div className="bg-gradient-to-r from-teal-600 via-emerald-600 to-emerald-700 p-8 text-center relative overflow-hidden animate-fadeIn">
            <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-bl-full -mr-4 -mt-4"></div>
            <div className="mx-auto bg-white/10 w-16 h-16 rounded-3xl flex items-center justify-center mb-4 backdrop-blur-md shadow-inner">
              <Wallet className="w-8 h-8 text-white animate-pulse" />
            </div>
            <h2 className="text-3xl font-black text-white tracking-tight">টাকা জমা করুন</h2>
            <p className="text-teal-100 font-bold mt-2 text-sm">
              চলমান মাস: {activeMonth?.name || 'কোনো মাস শুরু হয়নি'}
            </p>
          </div>

          <div className="p-8 md:p-10">
            <form onSubmit={handleSubmit} className="space-y-6">
              
              {/* Member Selector */}
              <div>
                <label className="block text-xs font-black text-gray-400 uppercase tracking-wider mb-2">মেম্বার নির্বাচন করুন</label>
                <div className="relative">
                  <select
                    required
                    value={userId}
                    onChange={(e) => setUserId(e.target.value)}
                    className="w-full px-4 py-3.5 bg-gray-50/50 rounded-xl border border-gray-200 focus:ring-2 focus:ring-teal-500 focus:border-teal-500 focus:bg-white transition-all outline-none text-sm font-extrabold text-gray-800 appearance-none cursor-pointer"
                  >
                    {members.map(m => (
                      <option key={m._id} value={m._id} className="font-semibold text-gray-700">{m.name} ({m.role})</option>
                    ))}
                  </select>
                  <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-4 text-gray-400">
                    <User className="w-4.5 h-4.5 text-gray-400" />
                  </div>
                </div>
              </div>

              {/* Date & Amount Inputs */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div>
                  <label className="block text-xs font-black text-gray-400 uppercase tracking-wider mb-2">তারিখ</label>
                  <div className="relative">
                    <input
                      type="date"
                      required
                      value={date}
                      onChange={(e) => setDate(e.target.value)}
                      className="w-full px-4 py-3.5 bg-gray-50/50 rounded-xl border border-gray-200 focus:ring-2 focus:ring-teal-500 focus:border-teal-500 focus:bg-white transition-all outline-none text-sm font-extrabold text-gray-800"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-black text-gray-400 uppercase tracking-wider mb-2">টাকার পরিমাণ</label>
                  <input
                    type="number"
                    required
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    className="w-full px-4 py-3.5 bg-gray-50/50 rounded-xl border border-gray-200 focus:ring-2 focus:ring-teal-500 focus:border-teal-500 focus:bg-white transition-all outline-none text-sm font-extrabold text-gray-900"
                    placeholder="যেমন: 2000"
                  />
                </div>
              </div>

              {/* Quick Amount Suggestion Buttons */}
              <div className="space-y-2.5">
                <span className="block text-[10px] font-black text-gray-400 uppercase tracking-wider">দ্রুত সিলেক্ট করুন (Quick deposit):</span>
                <div className="grid grid-cols-4 gap-3">
                  {[500, 1000, 1500, 2000].map((val) => (
                    <button
                      type="button"
                      key={val}
                      onClick={() => handleQuickAmount(val)}
                      className={cn(
                        "py-2.5 rounded-xl text-xs font-black border transition-all hover:scale-[1.03] active:scale-95 shadow-sm",
                        amount === val.toString() 
                          ? "bg-teal-600 border-teal-600 text-white shadow-teal-100" 
                          : "bg-white border-gray-200 text-gray-600 hover:bg-gray-50 hover:border-gray-300"
                      )}
                    >
                      +{val}
                    </button>
                  ))}
                </div>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={loading || !activeMonth}
                className="w-full flex justify-center items-center gap-2 py-4 bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-700 hover:to-emerald-700 text-white rounded-xl font-bold transition-all shadow-md shadow-teal-100 hover:shadow-lg disabled:opacity-70 text-sm mt-8"
              >
                {loading && <Loader2 className="w-5 h-5 animate-spin" />}
                {loading ? 'যুক্ত হচ্ছে...' : 'জমা নিশ্চিত করুন'}
                <ArrowRight className="w-4 h-4" />
              </button>
            </form>
          </div>
        </div>

        {/* Right Column: Member Financial Preview Card (5 columns) */}
        <div className="lg:col-span-5 space-y-6">
          
          {/* Main Selected Member Preview */}
          <div suppressHydrationWarning className="bg-white rounded-[2.5rem] p-6 md:p-8 shadow-[0_12px_40px_rgb(0,0,0,0.02)] border border-gray-100 relative overflow-hidden">
            <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none">
              <Coins className="w-24 h-24 text-teal-600" />
            </div>

            <div className="relative z-10 flex flex-col space-y-6 animate-scaleUp">
              <h3 className="font-extrabold text-gray-900 text-base flex items-center gap-2 border-b border-gray-50 pb-3">
                <Coins className="w-5 h-5 text-teal-500" />
                মেম্বার স্ট্যাটাস প্রিভিউ
              </h3>

              {selectedMember ? (
                <div className="space-y-6">
                  {/* Member Name Badge */}
                  <div className="flex items-center gap-3 bg-gray-50 p-4 rounded-2xl border border-gray-100">
                    <div className="w-12 h-12 rounded-xl bg-teal-100 text-teal-750 flex items-center justify-center font-black text-lg">
                      {selectedMember.name.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <h4 className="font-extrabold text-gray-900 capitalize text-sm">{selectedMember.name}</h4>
                      <span className="text-[10px] font-black text-teal-600 bg-teal-50 px-2 py-0.5 rounded-full uppercase tracking-wider">{selectedMember.role}</span>
                    </div>
                  </div>

                  {/* Financial Grid */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-gray-50/50 p-3.5 rounded-xl border border-gray-100 text-xs">
                      <span className="text-gray-400 font-bold block mb-0.5">মোট জমা</span>
                      <span className="text-base font-black text-gray-900">{selectedMember.deposit.toFixed(0)} ৳</span>
                    </div>
                    <div className="bg-gray-50/50 p-3.5 rounded-xl border border-gray-100 text-xs">
                      <span className="text-gray-400 font-bold block mb-0.5">মোট খরচ</span>
                      <span className="text-base font-black text-gray-900">{selectedMember.totalCost.toFixed(0)} ৳</span>
                    </div>
                  </div>

                  {/* Balance Display */}
                  <div className={cn(
                    "p-4 rounded-2xl border flex items-center justify-between",
                    selectedMember.balance >= 0 
                      ? "bg-emerald-50/50 border-emerald-100/50 text-emerald-800" 
                      : "bg-rose-50/50 border-rose-100/50 text-rose-800"
                  )}>
                    <div className="flex items-center gap-2">
                      {selectedMember.balance >= 0 
                        ? <CheckCircle2 className="w-5 h-5 text-emerald-500 flex-shrink-0 animate-bounce" />
                        : <AlertCircle className="w-5 h-5 text-rose-500 flex-shrink-0 animate-pulse" />
                      }
                      <div>
                        <span className="text-[10px] font-black text-gray-400 uppercase tracking-wider block">বর্তমান ব্যালেন্স</span>
                        <span className="font-black text-lg">{selectedMember.balance.toFixed(0)} ৳</span>
                      </div>
                    </div>
                    <span className={cn(
                      "px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider border",
                      selectedMember.balance >= 0 
                        ? "bg-emerald-50 border-emerald-200 text-emerald-600" 
                        : "bg-rose-50 border-rose-200 text-rose-600"
                    )}>
                      {selectedMember.balance >= 0 ? "প্লাস" : "মাইনাস"}
                    </span>
                  </div>

                  {/* Recommendation / Action details */}
                  <div className="bg-blue-50/30 border border-blue-100/40 p-4 rounded-2xl text-xs font-semibold leading-relaxed text-blue-900">
                    <p className="font-extrabold text-[13px] text-blue-950 flex items-center gap-1.5 mb-1">
                      <TrendingUp className="w-4 h-4 text-blue-500" />
                      স্মার্ট বাজেট রিকমেন্ডেশন:
                    </p>
                    {selectedMember.balance <= 0 ? (
                      <p className="text-gray-600 leading-normal text-[11px] font-bold">
                        এই মেম্বারের ব্যালেন্স ঋণাত্মক আছে। মেসের মিল সচল রাখতে এবং মেস বিল পরিশোধ করতে অন্তত <span className="text-rose-600 font-extrabold">{Math.abs(selectedMember.balance).toFixed(0)} ৳</span> এখনই জমা নেওয়া প্রয়োজন।
                      </p>
                    ) : (
                      <p className="text-gray-600 leading-normal text-[11px] font-bold">
                        মেম্বারের ব্যালেন্স প্লাসে রয়েছে। তবে চলতি মাসের খরচ অনুপাত মেলাতে প্রয়োজনে আরও ডিপোজিট যুক্ত করে রাখতে পারেন।
                      </p>
                    )}
                  </div>
                </div>
              ) : (
                <div className="text-center py-12 text-gray-400 text-xs font-bold bg-gray-50 rounded-2xl border border-gray-100/50">
                  কোনো মেম্বার সিলেক্ট করা নেই
                </div>
              )}
            </div>
          </div>

          {/* Quick Info details */}
          <div suppressHydrationWarning className="bg-gray-50 rounded-3xl p-6 border border-gray-150/70 text-xs font-bold text-gray-500 space-y-2">
            <h4 className="text-gray-700 font-black flex items-center gap-1.5 text-xs"><AlertCircle className="w-4 h-4 text-teal-600" /> গুরুত্বপূর্ণ তথ্য</h4>
            <ul className="list-disc pl-4 space-y-1 text-gray-400 text-[11px] leading-normal font-semibold">
              <li>টাকা জমার পরিমাণটি সরাসরি মেম্বারের অ্যাকাউন্টের টোটাল ডিপোজিটের সাথে যোগ হবে।</li>
              <li>ভুল এন্ট্রি হলে সেটি এডিট/ডিলিট করার জন্য লেনদেন রিপোর্ট বা লেজার হিস্ট্রিতে যান।</li>
              <li>মাইনাস (-) অ্যামাউন্ট যোগ করা যাবে হিসাব মিলানোর জন্য।</li>
            </ul>
          </div>

        </div>

      </div>
    </div>
  );
}
