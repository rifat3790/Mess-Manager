"use client";

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { 
  getMessSubscriptionDetails, 
  submitSubscriptionRequest 
} from '@/app/actions/subscriptionActions';
import { 
  Crown, 
  Copy, 
  Check, 
  Send, 
  Loader2, 
  ShieldCheck, 
  Clock, 
  AlertCircle, 
  Smartphone, 
  Sparkles,
  CheckCircle2,
  Lock,
  Zap,
  ArrowRight,
  HelpCircle
} from 'lucide-react';
import { toast } from 'react-hot-toast';

const PRICING_PLANS = [
  { months: 1, price: 20, tag: "পপুলার", perMonth: 20 },
  { months: 2, price: 30, tag: "২৫% ডিসকাউন্ট", perMonth: 15 },
  { months: 3, price: 35, tag: "৪১% সেভিংস", perMonth: 11.6 },
  { months: 4, price: 40, tag: "৫০% সেভিংস", perMonth: 10 },
  { months: 5, price: 50, tag: "বাজেট প্ল্যান", perMonth: 10 },
  { months: 6, price: 60, tag: "🔥 সেরা ভ্যালু", perMonth: 10 },
  { months: 12, price: 100, tag: "💎 সুপার ধামাকা", perMonth: 8.3 }
];

export default function SubscriptionPage() {
  const { mongoUser } = useAuth();
  const [loading, setLoading] = useState(true);
  const [subData, setSubData] = useState<any>(null);

  // Form states
  const [selectedPlan, setSelectedPlan] = useState<typeof PRICING_PLANS[0]>(PRICING_PLANS[0]);
  const [paymentMethod, setPaymentMethod] = useState<'bKash' | 'Nagad' | 'Rocket'>('bKash');
  const [senderPhone, setSenderPhone] = useState('');
  const [trxId, setTrxId] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [copied, setCopied] = useState(false);

  const BKASH_NAGAD_NUMBER = "01952321390";

  const fetchSubscription = async () => {
    const targetMessId = typeof mongoUser?.messId === 'object' ? mongoUser?.messId?._id : mongoUser?.messId;
    if (!targetMessId) {
      setLoading(false);
      return;
    }
    try {
      const res = await getMessSubscriptionDetails(targetMessId);
      if (res.success) {
        setSubData(res.subscription);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSubscription();
  }, [mongoUser?.messId]);

  const handleCopyNumber = () => {
    navigator.clipboard.writeText(BKASH_NAGAD_NUMBER);
    setCopied(true);
    toast.success("নম্বর কপি হয়েছে: " + BKASH_NAGAD_NUMBER);
    setTimeout(() => setCopied(false), 2500);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const targetMessId = typeof mongoUser?.messId === 'object' ? mongoUser?.messId?._id : mongoUser?.messId;
    if (!targetMessId || !mongoUser?._id) return;

    if (!senderPhone.trim()) {
      toast.error("প্রেরক ফোন নম্বর লিখুন!");
      return;
    }
    if (!trxId.trim()) {
      toast.error("ট্রানজেকশন আইডি (TrxID) লিখুন!");
      return;
    }

    try {
      setSubmitting(true);
      const res = await submitSubscriptionRequest(
        mongoUser._id,
        targetMessId,
        paymentMethod,
        senderPhone,
        trxId,
        selectedPlan.price,
        selectedPlan.months
      );

      if (res.success) {
        toast.success("🎉 পেমেন্ট রিকোয়েস্ট সফলভাবে জমা হয়েছে! অ্যাডমিন যাচাই করে এপ্রুভ করবে।");
        setSenderPhone('');
        setTrxId('');
        fetchSubscription();
      } else {
        toast.error(res.error || "পেমেন্ট জমা দিতে সমস্যা হয়েছে");
      }
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh]">
        <Loader2 className="w-10 h-10 text-indigo-600 animate-spin mb-3" />
        <p className="text-slate-500 font-bold text-sm">সাবস্ক্রিপশন তথ্য লোড হচ্ছে...</p>
      </div>
    );
  }

  const isSubActive = subData?.isActive;
  const daysLeft = subData?.daysLeft || 0;
  const pendingReq = subData?.pendingRequest;

  return (
    <div className="w-full space-y-8 pb-16">
      {/* Header Banner - Full Width */}
      <div className="bg-gradient-to-br from-indigo-950 via-indigo-900 to-slate-900 rounded-3xl p-8 sm:p-10 text-white relative overflow-hidden shadow-xl border border-indigo-700/40">
        <div className="absolute top-0 right-0 p-8 opacity-10 pointer-events-none">
          <Crown className="w-72 h-72 text-amber-300" />
        </div>

        <div className="relative z-10 space-y-4 max-w-3xl">
          <span className="px-3.5 py-1 bg-amber-400/20 text-amber-300 border border-amber-400/30 text-xs font-black rounded-full uppercase tracking-widest inline-flex items-center gap-1.5 backdrop-blur-md">
            <Sparkles className="w-3.5 h-3.5" />
            মেস প্রিমিয়াম সাবস্ক্রিপশন সেন্টার
          </span>
          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black tracking-tight text-white leading-tight">
            আনলিমিটেড মেস ড্যাশবোর্ড ও এডিটিং ফিচারের জন্য সাবস্ক্রিপশন যুক্ত করুন
          </h1>
          <p className="text-indigo-200 text-xs sm:text-sm font-medium leading-relaxed">
            মেসের মিল হিসাব, ক্যাশবুক এবং বাজার তালিকা নিয়মিত এডিট ও পরিচালনা করতে সাশ্রয়ী মূল্যে সাবস্ক্রিপশন রেনিউ করুন।
          </p>
        </div>

        {/* Live Active Status Banner */}
        <div className="mt-8 pt-6 border-t border-indigo-700/50 flex flex-wrap items-center justify-between gap-4 relative z-10">
          {isSubActive ? (
            <div className="flex items-center gap-3 bg-emerald-500/20 border border-emerald-400/40 px-5 py-3 rounded-2xl backdrop-blur-md">
              <ShieldCheck className="w-7 h-7 text-emerald-400" />
              <div>
                <p className="text-xs sm:text-sm font-black text-emerald-300">প্রিমিয়াম সাবস্ক্রিপশন সচল রয়েছে</p>
                <p className="text-xs text-emerald-200/80 font-semibold">
                  মেয়াদ শেষ: {new Date(subData.expiresAt).toLocaleDateString('bn-BD', { day: 'numeric', month: 'long', year: 'numeric' })} (আর {daysLeft} দিন বাকি)
                </p>
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-3 bg-rose-500/20 border border-rose-400/40 px-5 py-3 rounded-2xl backdrop-blur-md">
              <AlertCircle className="w-7 h-7 text-rose-400" />
              <div>
                <p className="text-xs sm:text-sm font-black text-rose-300">সাবস্ক্রিপশন মেয়াদোত্তীর্ণ বা নিষ্ক্রিয়</p>
                <p className="text-xs text-rose-200/80 font-semibold">
                  বর্তমানে আপনার মেসটি রিড-অনলি মোডে রয়েছে। প্ল্যান রেনিউ করে ডেটা এডিটিং সচল করুন।
                </p>
              </div>
            </div>
          )}

          {pendingReq && (
            <div className="flex items-center gap-2.5 bg-amber-500/20 border border-amber-400/40 px-5 py-3 rounded-2xl text-xs text-amber-200 font-bold backdrop-blur-md">
              <Clock className="w-4 h-4 animate-spin text-amber-300" />
              <span>একটি পেমেন্ট রিকোয়েস্ট (TrxID: {pendingReq.trxId}) অ্যাডমিন অনুমোদনের অপেক্ষায় আছে</span>
            </div>
          )}
        </div>
      </div>

      {/* Main Grid: 2-Column Responsive Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left 2 Columns: Number Card & Pricing Plans */}
        <div className="lg:col-span-2 space-y-8">
          {/* bKash / Nagad Send Money Box */}
          <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-100 shadow-sm space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 bg-gradient-to-r from-rose-50 via-indigo-50 to-emerald-50 rounded-2xl p-6 border border-slate-200/60">
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Smartphone className="w-5 h-5 text-rose-600" />
                  <span className="text-xs font-black text-slate-700 uppercase tracking-wider">bKash / Nagad Personal Send Money</span>
                </div>
                <h2 className="text-3xl sm:text-4xl font-black text-slate-900 font-mono tracking-wider">
                  {BKASH_NAGAD_NUMBER}
                </h2>
                <p className="text-xs text-slate-500 font-medium">
                  উপরে উল্লেখিত নম্বরে bKash অথবা Nagad অ্যাপ থেকে Send Money সম্পন্ন করুন এবং TrxID দিয়ে ডানপাশের ফর্ম পূরণ করুন।
                </p>
              </div>

              <button
                type="button"
                onClick={handleCopyNumber}
                className={`px-6 py-4 rounded-2xl font-black text-xs flex items-center gap-2 transition-all shadow-md whitespace-nowrap ${
                  copied
                    ? 'bg-emerald-600 text-white shadow-emerald-200'
                    : 'bg-rose-600 hover:bg-rose-700 text-white shadow-rose-200'
                }`}
              >
                {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                {copied ? 'নম্বর কপি হয়েছে!' : 'এক ক্লিকে নম্বর কপি করুন'}
              </button>
            </div>

            {/* Pricing Plans Grid */}
            <div className="space-y-4 pt-2">
              <div>
                <h3 className="text-base font-extrabold text-slate-900">১. আপনার সাবস্ক্রিপশন প্ল্যান সিলেক্ট করুন</h3>
                <p className="text-xs text-slate-400 font-medium mt-0.5">যত বেশি মাসের প্ল্যান নিবেন, তত বেশি ডিসকাউন্ট পাবেন</p>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
                {PRICING_PLANS.map((plan) => {
                  const isSelected = selectedPlan.months === plan.months;
                  return (
                    <div
                      key={plan.months}
                      onClick={() => setSelectedPlan(plan)}
                      className={`cursor-pointer rounded-2xl p-5 border transition-all flex flex-col justify-between relative overflow-hidden ${
                        isSelected
                          ? 'bg-indigo-600 text-white border-indigo-600 shadow-lg shadow-indigo-200 scale-[1.02]'
                          : 'bg-white text-slate-800 border-slate-200 hover:border-indigo-300 hover:shadow-md'
                      }`}
                    >
                      {plan.tag && (
                        <span className={`absolute top-0 right-0 px-3 py-0.5 rounded-bl-xl text-[9px] font-black uppercase tracking-wider ${
                          isSelected ? 'bg-amber-400 text-slate-950' : 'bg-indigo-100 text-indigo-700'
                        }`}>
                          {plan.tag}
                        </span>
                      )}

                      <div className="space-y-1">
                        <span className={`text-xs font-extrabold ${isSelected ? 'text-indigo-200' : 'text-slate-400'}`}>
                          {plan.months} মাস মেয়াদী
                        </span>
                        <h4 className="text-2xl font-black">
                          ৳{plan.price}
                        </h4>
                      </div>

                      <div className="pt-3 border-t border-slate-100/20 mt-3 flex items-center justify-between text-[11px] font-bold">
                        <span className={isSelected ? 'text-indigo-200' : 'text-slate-500'}>
                          ৳{plan.perMonth.toFixed(1)}/মাস
                        </span>
                        {isSelected && <CheckCircle2 className="w-4 h-4 text-amber-300" />}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Feature Comparison Matrix: Free vs VIP Premium */}
          <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-100 shadow-sm space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-base font-extrabold text-slate-900">⚡ ফ্রি (রিড-অনলি) বনাম প্রিমিয়াম সুবিধা</h3>
                <p className="text-xs text-slate-400 font-medium mt-0.5">সাবস্ক্রিপশন সচল থাকলে যে ফিচারগুলো আনলক হবে</p>
              </div>
              <span className="px-3.5 py-1 bg-indigo-50 text-indigo-700 font-extrabold text-xs rounded-xl border border-indigo-100">
                VIP Feature Matrix
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
              <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-5 space-y-3">
                <div className="flex items-center gap-2 text-rose-600 font-extrabold text-xs uppercase tracking-wider">
                  <Lock className="w-4 h-4" />
                  <span>ফ্রি / মেয়াদোত্তীর্ণ ভার্সন</span>
                </div>
                <ul className="space-y-2 text-xs text-slate-600 font-medium">
                  <li className="flex items-center gap-2 text-slate-500">
                    <span className="text-rose-500 font-bold">✕</span> দৈনিক মিল যোগ ও এডিট করা বন্ধ
                  </li>
                  <li className="flex items-center gap-2 text-slate-500">
                    <span className="text-rose-500 font-bold">✕</span> মেস বাজার ও যৌথ খরচ যোগ করা বন্ধ
                  </li>
                  <li className="flex items-center gap-2 text-slate-500">
                    <span className="text-rose-500 font-bold">✕</span> নতুন নোটিশ ও ক্যাশবুক এন্ট্রি বন্ধ
                  </li>
                  <li className="flex items-center gap-2 text-slate-500">
                    <span className="text-emerald-600 font-bold">✓</span> শুধুমাত্র পূর্বের হিসাব দেখা যাবে (Read Only)
                  </li>
                </ul>
              </div>

              <div className="bg-gradient-to-br from-indigo-50 to-emerald-50 border border-indigo-200/80 rounded-2xl p-5 space-y-3 shadow-sm">
                <div className="flex items-center gap-2 text-indigo-700 font-extrabold text-xs uppercase tracking-wider">
                  <Zap className="w-4 h-4 text-amber-500" />
                  <span>প্রিমিয়াম ভিআইপি ভার্সন</span>
                </div>
                <ul className="space-y-2 text-xs text-slate-800 font-semibold">
                  <li className="flex items-center gap-2 text-slate-800">
                    <span className="text-emerald-600 font-black">✓</span> মিল হিসাব আনলিমিটেড যোগ ও লাইব এডিট
                  </li>
                  <li className="flex items-center gap-2 text-slate-800">
                    <span className="text-emerald-600 font-black">✓</span> বাজার ও লেনদেনের ইনস্ট্যান্ট ক্যাশবুক
                  </li>
                  <li className="flex items-center gap-2 text-slate-800">
                    <span className="text-emerald-600 font-black">✓</span> নোটিশ বোর্ড, চ্যাট ও বাজার শিডিউল সচল
                  </li>
                  <li className="flex items-center gap-2 text-slate-800">
                    <span className="text-emerald-600 font-black">✓</span> 0ms ফার্স্ট স্পিড এবং ক্লাউড ব্যাকআপ
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </div>

        {/* Right 1 Column: Submission Form */}
        <div className="space-y-8">
          <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-100 shadow-sm space-y-6 sticky top-6">
            <div>
              <h3 className="text-base font-extrabold text-slate-900">২. পেমেন্ট ভেরিফিকেশন ফর্ম</h3>
              <p className="text-xs text-slate-400 font-medium mt-0.5">টাকা পাঠানোর পর প্রেরক নম্বর ও TrxID লিখে সাবমিট করুন</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
              {/* Payment Method Choice */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-2">পেমেন্ট মেথড নির্বাচন করুন</label>
                <div className="flex gap-2">
                  {(['bKash', 'Nagad', 'Rocket'] as const).map((method) => (
                    <button
                      key={method}
                      type="button"
                      onClick={() => setPaymentMethod(method)}
                      className={`flex-1 py-3 px-2 rounded-2xl text-xs font-black transition-all border ${
                        paymentMethod === method
                          ? 'bg-indigo-50 border-indigo-600 text-indigo-700 shadow-sm'
                          : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                      }`}
                    >
                      {method === 'bKash' ? '💖 bKash' : method === 'Nagad' ? '🟧 Nagad' : '🚀 Rocket'}
                    </button>
                  ))}
                </div>
              </div>

              {/* Sender Phone */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  প্রেরক ফোন নম্বর (Sender Number) *
                </label>
                <input
                  type="text"
                  required
                  placeholder="যেমন: 017XXXXXXXX"
                  value={senderPhone}
                  onChange={(e) => setSenderPhone(e.target.value)}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              {/* TrxID */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  ট্রানজেকশন আইডি (TrxID) *
                </label>
                <input
                  type="text"
                  required
                  placeholder="যেমন: 9J8K7L6M"
                  value={trxId}
                  onChange={(e) => setTrxId(e.target.value)}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-mono font-bold text-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 uppercase"
                />
              </div>

              {/* Plan Summary Bar */}
              <div className="bg-indigo-50/70 border border-indigo-100 rounded-2xl p-4 flex items-center justify-between text-xs font-bold text-indigo-900">
                <span>নির্বাচিত প্ল্যান: {selectedPlan.months} মাস</span>
                <span className="text-sm font-black text-indigo-700">মোট পরিদেয়: ৳{selectedPlan.price}</span>
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="w-full py-4 bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold rounded-2xl text-xs flex items-center justify-center gap-2 shadow-lg shadow-indigo-200 disabled:opacity-50 transition-all"
              >
                {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                পেমেন্ট রিকোয়েস্ট নিশ্চিত করুন
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
