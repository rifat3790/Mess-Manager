"use client";

import { Wallet, Utensils, ShoppingBag, CreditCard, ArrowUpRight, TrendingDown, FileText, Loader2, AlertCircle, Home as HomeIcon, Receipt, Users, Search, Calendar, CheckCircle2, MessageSquare } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/context/AuthContext';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { getDashboardData } from './actions/dataActions';
import { getBazaarSchedules } from './actions/bazaarActions';
import { useRouter } from 'next/navigation';

export default function Home() {
  const { user, mongoUser, loading: authLoading, messName } = useAuth();
  const router = useRouter();
  
  const [dataLoading, setDataLoading] = useState(true);
  const [globalStats, setGlobalStats] = useState<any>(null);
  const [myStats, setMyStats] = useState<any>(null);
  const [allMembers, setAllMembers] = useState<any[]>([]);
  const [bazaarSchedules, setBazaarSchedules] = useState<any[]>([]);

  useEffect(() => {
    async function fetchData() {
      if (!user || !mongoUser || mongoUser.role === 'Pending') {
        setDataLoading(false);
        return;
      }
      
      const [res, scheduleRes] = await Promise.all([
        getDashboardData(),
        getBazaarSchedules()
      ]);

      if (scheduleRes.success) {
        setBazaarSchedules(scheduleRes.schedules || []);
      }

      if (res.success) {
        if (res.stats) {
          setGlobalStats(res.stats);
          setAllMembers(res.members || []);
          const me = res.members.find((m: any) => m._id === mongoUser._id);
          if (me) {
            setMyStats(me);
          } else {
            setMyStats({
              totalMeal: 0, deposit: 0, totalCost: 0, balance: 0
            });
          }
        } else {
          setGlobalStats({
            monthName: 'কোনো চলমান মাস নেই',
            balance: 0,
            totalDeposit: 0,
            totalMeals: 0,
            mealExpenses: 0,
            mealRate: 0,
            singleExpenses: 0,
            jointExpenses: 0
          });
          setMyStats({
            totalMeal: 0, deposit: 0, totalCost: 0, balance: 0
          });
          setAllMembers([]);
        }
      }
      setDataLoading(false);
    }
    fetchData();
  }, [user, mongoUser]);
  
  if (authLoading || dataLoading) {
    return (
      <div suppressHydrationWarning className="flex flex-col items-center justify-center min-h-[60vh]">
        <Loader2 className="w-12 h-12 text-blue-500 animate-spin mb-4" />
        <p className="text-gray-500 font-medium">লোড হচ্ছে...</p>
      </div>
    );
  }

  if (!user || !mongoUser) {
    return (
      <div suppressHydrationWarning className="flex flex-col items-center justify-center min-h-[60vh] bg-white rounded-3xl p-8 border border-gray-100 shadow-[0_8px_30px_rgb(0,0,0,0.04)]">
        <div suppressHydrationWarning className="w-20 h-20 bg-blue-50 rounded-full flex items-center justify-center mb-6">
          <Wallet className="w-10 h-10 text-blue-600" />
        </div>
        <h2 className="text-3xl font-bold text-gray-900 mb-2">Mess Manager Premium</h2>
        <p className="text-gray-500 mb-8 max-w-md text-center">আপনার মেসের সব হিসাব নিকাশ এখন আপনার হাতের মুঠোয়। ব্যবহার করতে লগইন করুন।</p>
        <Link href="/login" className="px-8 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-medium transition-colors shadow-md shadow-blue-200">
          লগইন করুন
        </Link>
      </div>
    );
  }

  if (mongoUser.role === 'Pending') {
    return (
      <div suppressHydrationWarning className="flex flex-col items-center justify-center min-h-[60vh] bg-white rounded-3xl p-8 border border-orange-100 shadow-[0_8px_30px_rgb(0,0,0,0.04)]">
        <div suppressHydrationWarning className="w-20 h-20 bg-orange-50 rounded-full flex items-center justify-center mb-6">
          <AlertCircle className="w-10 h-10 text-orange-500" />
        </div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">অ্যাকাউন্ট অ্যাপ্রুভালের অপেক্ষায়!</h2>
        <p className="text-gray-500 mb-8 max-w-md text-center">আপনার অ্যাকাউন্টটি ম্যানেজারের অ্যাপ্রুভালের জন্য অপেক্ষমান আছে। ম্যানেজার অ্যাপ্রুভ করলেই আপনি অ্যাপটি ব্যবহার করতে পারবেন।</p>
      </div>
    );
  }

  if (!globalStats || !myStats) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh]">
        <p className="text-red-500 font-medium">ডেটা লোড করতে সমস্যা হয়েছে। দয়া করে পেজটি রিফ্রেশ করুন।</p>
      </div>
    );
  }

  const hour = new Date().getHours();
  let greeting = 'শুভ সকাল';
  if (hour >= 12 && hour < 17) greeting = 'শুভ অপরাহ্ন';
  else if (hour >= 17 && hour < 20) greeting = 'শুভ সন্ধ্যা';
  else if (hour >= 20 || hour < 5) greeting = 'শুভ রাত্রি';

  return (
    <div suppressHydrationWarning className="w-full space-y-10 pb-16">
      
      {/* Dynamic Greeting & Quick Actions Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 px-2 pt-2">
        <div>
          <h2 className="text-3xl font-extrabold text-gray-900 tracking-tight flex items-center gap-2">
            {greeting}, {mongoUser.name.split(' ')[0]}! <span className="text-2xl">👋</span>
          </h2>
          <p className="text-gray-500 font-medium mt-1 text-sm">
            আজকের দিনটি আপনার ভালো কাটুক। আপনার বর্তমান মাসের হিসাব নিচে দেওয়া হলো।
          </p>
        </div>
        
        <div className="flex items-center gap-3 overflow-x-auto pb-2 md:pb-0 scrollbar-hide">
           <button onClick={() => router.push('/chat')} className="flex items-center gap-2 px-4 py-2.5 bg-white border border-gray-200 text-gray-700 font-bold rounded-xl shadow-sm hover:border-blue-300 hover:text-blue-600 transition-colors whitespace-nowrap">
             <MessageSquare className="w-4 h-4" /> চ্যাট
           </button>
           <button onClick={() => router.push('/bazaar')} className="flex items-center gap-2 px-4 py-2.5 bg-white border border-gray-200 text-gray-700 font-bold rounded-xl shadow-sm hover:border-emerald-300 hover:text-emerald-600 transition-colors whitespace-nowrap">
             <Calendar className="w-4 h-4" /> বাজার শিডিউল
           </button>
           {(mongoUser.role === 'Super Admin' || mongoUser.role === 'Manager') && (
             <button onClick={() => router.push('/report/single')} className="flex items-center gap-2 px-4 py-2.5 bg-gray-900 text-white font-bold rounded-xl shadow-sm hover:bg-gray-800 transition-colors whitespace-nowrap">
               <FileText className="w-4 h-4" /> লেনদেন ম্যানেজ
             </button>
           )}
        </div>
      </div>

      {/* 1. Full-Width Hero Section for Global Stats */}
      <div suppressHydrationWarning className="relative bg-gradient-to-r from-blue-50 via-white to-purple-50 rounded-[2.5rem] p-8 md:p-10 border border-white/60 shadow-[0_8px_30px_rgb(0,0,0,0.04)] overflow-hidden">
        {/* Soft decorative blur shapes */}
        <div suppressHydrationWarning className="absolute -top-20 -left-20 w-64 h-64 bg-blue-200/40 rounded-full blur-3xl"></div>
        <div suppressHydrationWarning className="absolute -bottom-20 -right-20 w-64 h-64 bg-purple-200/40 rounded-full blur-3xl"></div>
        
        <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6 mb-10">
          <div className="flex items-center gap-4">
             <div className="w-16 h-16 bg-white rounded-2xl flex items-center justify-center shadow-sm text-blue-600 font-bold text-3xl">
               {messName?.charAt(0) || 'M'}
             </div>
             <div>
               <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight">{messName || 'Mohakhali Mess'}</h1>
               <p className="text-lg text-gray-500 font-medium">
                 {globalStats.monthName === 'কোনো চলমান মাস নেই' ? 'কোনো চলমান মাস নেই' : `${globalStats.monthName} (Running)`}
               </p>
             </div>
          </div>
          <button 
            onClick={() => router.push('/report/single')}
            className="flex items-center gap-2 px-6 py-3 bg-white text-indigo-600 hover:bg-indigo-50 hover:text-indigo-700 font-bold rounded-xl shadow-sm border border-indigo-100 transition-all"
          >
            <FileText className="w-5 h-5" />
            মাসের বিস্তারিত হিসাব
          </button>
        </div>

        <div suppressHydrationWarning className="relative z-10 grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4">
          <div suppressHydrationWarning className="bg-white/60 backdrop-blur-md p-4 rounded-2xl border border-white/50 shadow-sm">
             <p className="text-sm font-semibold text-gray-500 mb-1 flex items-center gap-1"><Wallet className="w-4 h-4 text-emerald-500"/> ব্যালেন্স</p>
             <p className="text-xl font-bold text-gray-900">{globalStats.balance.toFixed(2)} ৳</p>
          </div>
          <div suppressHydrationWarning className="bg-white/60 backdrop-blur-md p-4 rounded-2xl border border-white/50 shadow-sm">
             <p className="text-sm font-semibold text-gray-500 mb-1 flex items-center gap-1"><ArrowUpRight className="w-4 h-4 text-blue-500"/> মোট জমা</p>
             <p className="text-xl font-bold text-gray-900">{globalStats.totalDeposit.toFixed(2)} ৳</p>
          </div>
          <div suppressHydrationWarning className="bg-white/60 backdrop-blur-md p-4 rounded-2xl border border-white/50 shadow-sm">
             <p className="text-sm font-semibold text-gray-500 mb-1 flex items-center gap-1"><Utensils className="w-4 h-4 text-orange-500"/> মোট মিল</p>
             <p className="text-xl font-bold text-gray-900">{globalStats.totalMeals.toFixed(2)}</p>
          </div>
          <div suppressHydrationWarning className="bg-white/60 backdrop-blur-md p-4 rounded-2xl border border-white/50 shadow-sm">
             <p className="text-sm font-semibold text-gray-500 mb-1 flex items-center gap-1"><TrendingDown className="w-4 h-4 text-rose-500"/> মিল খরচ</p>
             <p className="text-xl font-bold text-gray-900">{globalStats.mealExpenses.toFixed(2)} ৳</p>
          </div>
          <div suppressHydrationWarning className="bg-white/60 backdrop-blur-md p-4 rounded-2xl border border-white/50 shadow-sm">
             <p className="text-sm font-semibold text-gray-500 mb-1 flex items-center gap-1"><Receipt className="w-4 h-4 text-indigo-500"/> মিল রেট</p>
             <p className="text-xl font-bold text-gray-900">{globalStats.mealRate.toFixed(2)} ৳</p>
          </div>
          <div suppressHydrationWarning className="bg-white/60 backdrop-blur-md p-4 rounded-2xl border border-white/50 shadow-sm">
             <p className="text-sm font-semibold text-gray-500 mb-1 flex items-center gap-1"><ShoppingBag className="w-4 h-4 text-fuchsia-500"/> একক খরচ</p>
             <p className="text-xl font-bold text-gray-900">{globalStats.singleExpenses?.toFixed(2) || '0.00'} ৳</p>
          </div>
          <div suppressHydrationWarning className="bg-white/60 backdrop-blur-md p-4 rounded-2xl border border-white/50 shadow-sm">
             <p className="text-sm font-semibold text-gray-500 mb-1 flex items-center gap-1"><Users className="w-4 h-4 text-teal-500"/> যৌথ খরচ</p>
             <p className="text-xl font-bold text-gray-900">{globalStats.jointExpenses?.toFixed(2) || '0.00'} ৳</p>
          </div>
        </div>
      </div>

      {/* 2. My Stats & Bazaar Date */}
      <div suppressHydrationWarning className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* My Stats - Takes 8 columns */}
        <div suppressHydrationWarning className="lg:col-span-8">
          <div suppressHydrationWarning className="flex items-center gap-3 mb-6">
            <h2 className="text-2xl font-extrabold text-gray-900">আমার হিসাব</h2>
            <span className="text-sm font-bold text-indigo-600 bg-indigo-50 px-4 py-1.5 rounded-full">{mongoUser.name}</span>
          </div>
          
          <div suppressHydrationWarning className="grid grid-cols-2 md:grid-cols-4 gap-5">
            {/* Blue Card */}
            <div suppressHydrationWarning className="bg-white rounded-[1.5rem] p-6 shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-gray-100 relative overflow-hidden group hover:-translate-y-1 transition-transform">
                <div suppressHydrationWarning className="absolute top-0 right-0 w-24 h-24 bg-sky-50 rounded-bl-full -mr-4 -mt-4 transition-colors group-hover:bg-sky-100"></div>
                <div suppressHydrationWarning className="relative z-10">
                  <div suppressHydrationWarning className="w-12 h-12 bg-white rounded-xl shadow-sm border border-sky-100 text-sky-500 flex items-center justify-center mb-6">
                    <Utensils className="w-6 h-6" />
                  </div>
                  <p className="text-3xl font-black text-gray-900 mb-1">{myStats.totalMeal.toFixed(2)}</p>
                  <p className="text-sm font-semibold text-gray-500 uppercase tracking-wider">মোট মিল</p>
                </div>
            </div>

            {/* Green Card */}
            <div suppressHydrationWarning className="bg-white rounded-[1.5rem] p-6 shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-gray-100 relative overflow-hidden group hover:-translate-y-1 transition-transform">
                <div suppressHydrationWarning className="absolute top-0 right-0 w-24 h-24 bg-emerald-50 rounded-bl-full -mr-4 -mt-4 transition-colors group-hover:bg-emerald-100"></div>
                <div suppressHydrationWarning className="relative z-10">
                  <div suppressHydrationWarning className="w-12 h-12 bg-white rounded-xl shadow-sm border border-emerald-100 text-emerald-500 flex items-center justify-center mb-6">
                    <Wallet className="w-6 h-6" />
                  </div>
                  <div suppressHydrationWarning className="flex items-baseline gap-1 mb-1">
                    <p className="text-3xl font-black text-gray-900">{myStats.deposit.toFixed(2)}</p>
                    <p className="text-lg font-bold text-gray-400">৳</p>
                  </div>
                  <p className="text-sm font-semibold text-gray-500 uppercase tracking-wider">মোট জমা</p>
                </div>
            </div>

            {/* Red Card */}
            <div suppressHydrationWarning className="bg-white rounded-[1.5rem] p-6 shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-gray-100 relative overflow-hidden group hover:-translate-y-1 transition-transform">
                <div suppressHydrationWarning className="absolute top-0 right-0 w-24 h-24 bg-rose-50 rounded-bl-full -mr-4 -mt-4 transition-colors group-hover:bg-rose-100"></div>
                <div suppressHydrationWarning className="relative z-10">
                  <div suppressHydrationWarning className="w-12 h-12 bg-white rounded-xl shadow-sm border border-rose-100 text-rose-500 flex items-center justify-center mb-6">
                    <ShoppingBag className="w-6 h-6" />
                  </div>
                  <div suppressHydrationWarning className="flex items-baseline gap-1 mb-1">
                    <p className="text-3xl font-black text-gray-900">{myStats.totalCost.toFixed(2)}</p>
                    <p className="text-lg font-bold text-gray-400">৳</p>
                  </div>
                  <p className="text-sm font-semibold text-gray-500 uppercase tracking-wider">মোট খরচ</p>
                </div>
            </div>

            {/* Yellow Card */}
            <div suppressHydrationWarning className="bg-white rounded-[1.5rem] p-6 shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-gray-100 relative overflow-hidden group hover:-translate-y-1 transition-transform">
                <div suppressHydrationWarning className="absolute top-0 right-0 w-24 h-24 bg-amber-50 rounded-bl-full -mr-4 -mt-4 transition-colors group-hover:bg-amber-100"></div>
                <div suppressHydrationWarning className="relative z-10">
                  <div suppressHydrationWarning className="w-12 h-12 bg-white rounded-xl shadow-sm border border-amber-100 text-amber-500 flex items-center justify-center mb-6">
                    <CreditCard className="w-6 h-6" />
                  </div>
                  <div suppressHydrationWarning className="flex items-baseline gap-1 mb-1">
                    <p className={cn("text-3xl font-black", myStats.balance >= 0 ? "text-gray-900" : "text-rose-600")}>
                      {myStats.balance.toFixed(2)}
                    </p>
                    <p className="text-lg font-bold text-gray-400">৳</p>
                  </div>
                  <p className="text-sm font-semibold text-gray-500 uppercase tracking-wider">ব্যালেন্স</p>
                </div>
            </div>
          </div>
        </div>

        {/* Bazaar Date - Takes 4 columns */}
        <div suppressHydrationWarning className="lg:col-span-4 flex flex-col">
          <h2 className="text-2xl font-extrabold text-gray-900 mb-6">বাজারের তারিখ</h2>
          <div suppressHydrationWarning className="bg-white flex-1 rounded-[1.5rem] p-8 shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-gray-100 flex flex-col relative overflow-hidden">
             
             <div suppressHydrationWarning className="absolute top-0 right-0 p-6 opacity-5 pointer-events-none">
                <Calendar className="w-32 h-32 text-indigo-500" />
             </div>

             <div suppressHydrationWarning className="relative z-10 flex-1 flex flex-col">
               {(() => {
                 const mySchedule = bazaarSchedules.find(s => s.userId._id === mongoUser._id && s.status === 'Approved');
                 const myPending = bazaarSchedules.find(s => s.userId._id === mongoUser._id && s.status === 'Pending');
                 const myCompleted = bazaarSchedules.find(s => s.userId._id === mongoUser._id && s.status === 'Completed');
                 
                 if (myCompleted) {
                   return (
                     <div className="mb-6">
                       <p className="text-gray-500 font-medium mb-3">বাজার স্ট্যাটাস</p>
                       <div className="bg-emerald-50 border border-emerald-200 text-emerald-700 font-bold px-5 py-4 rounded-xl shadow-sm flex items-center gap-2">
                         <CheckCircle2 className="w-5 h-5" /> 
                         আপনার এই মাসের বাজার কমপ্লিট হয়ে গেছে!
                       </div>
                     </div>
                   );
                 } else if (mySchedule) {
                   return (
                     <div className="mb-6">
                       <p className="text-gray-500 font-medium mb-3">আপনার বাজারের দিন</p>
                       <div className="bg-gradient-to-r from-indigo-50 to-blue-50 border border-indigo-100 text-indigo-900 font-bold text-lg px-5 py-4 rounded-xl shadow-sm">
                         {new Date(mySchedule.fromDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })} 
                         {' - '} 
                         {new Date(mySchedule.toDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })}
                       </div>
                     </div>
                   );
                 } else if (myPending) {
                   return (
                     <div className="mb-6">
                       <p className="text-amber-600 font-medium mb-3">রিকোয়েস্ট পেন্ডিং আছে...</p>
                       <div className="bg-amber-50 border border-amber-200 text-amber-800 font-bold px-5 py-4 rounded-xl shadow-sm">
                         {new Date(myPending.fromDate).toLocaleDateString('en-GB')} - {new Date(myPending.toDate).toLocaleDateString('en-GB')}
                       </div>
                     </div>
                   );
                 } else {
                   return (
                     <div className="mb-6">
                       <p className="text-gray-500 font-medium mb-3">কোনো বাজারের ডেট সেট করা নেই</p>
                     </div>
                   );
                 }
               })()}
               
               <div className="mt-auto pt-4 border-t border-gray-100">
                 {(mongoUser.role === 'Super Admin' || mongoUser.role === 'Manager') ? (
                   <button 
                     onClick={() => router.push('/bazaar')}
                     className="w-full py-3.5 bg-gray-900 hover:bg-gray-800 text-white rounded-xl font-bold transition-colors flex items-center justify-center gap-2 shadow-lg shadow-gray-200"
                   >
                     <Calendar className="w-5 h-5" />
                     শিডিউল ম্যানেজ করুন
                   </button>
                 ) : (
                   <button 
                     onClick={() => router.push('/bazaar/request')}
                     className="w-full py-3.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold transition-colors flex items-center justify-center gap-2 shadow-lg shadow-indigo-200"
                   >
                     <Calendar className="w-5 h-5" />
                     নতুন ডেট রিকোয়েস্ট করুন
                   </button>
                 )}
               </div>
             </div>
          </div>
        </div>

      </div>

      {/* 3. Bottom Section: All Members Table */}
      <div suppressHydrationWarning className="mt-8">
         <div suppressHydrationWarning className="flex items-center justify-between mb-6">
           <div suppressHydrationWarning>
             <h2 className="text-2xl font-extrabold text-gray-900 tracking-tight">মেস মেম্বারদের বর্তমান অবস্থা</h2>
             <p className="text-gray-500 mt-1 font-medium">চলমান মাসে সকল মেম্বারের রিয়েল-টাইম ব্যালেন্স ও হিসাব</p>
           </div>
         </div>
         
         <div suppressHydrationWarning className="bg-white rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-gray-100 overflow-hidden">
           <div suppressHydrationWarning className="overflow-x-auto">
             <table className="w-full text-left border-collapse">
               <thead>
                 <tr className="bg-gray-50 border-b border-gray-100">
                   <th className="px-6 py-5 text-sm font-bold text-gray-400 uppercase tracking-wider">মেম্বার</th>
                   <th className="px-6 py-5 text-sm font-bold text-gray-400 uppercase tracking-wider text-center">মোট মিল</th>
                   <th className="px-6 py-5 text-sm font-bold text-gray-400 uppercase tracking-wider text-center">জমা</th>
                   <th className="px-6 py-5 text-sm font-bold text-gray-400 uppercase tracking-wider text-center">মোট খরচ</th>
                   <th className="px-6 py-5 text-sm font-bold text-gray-400 uppercase tracking-wider text-right">ব্যালেন্স</th>
                 </tr>
               </thead>
               <tbody className="divide-y divide-gray-50">
                 {allMembers.length === 0 ? (
                   <tr>
                     <td colSpan={5} className="px-6 py-12 text-center text-gray-500 font-medium">কোনো মেম্বারের ডাটা পাওয়া যায়নি।</td>
                   </tr>
                 ) : (
                   allMembers.map((member, idx) => (
                     <tr key={member._id} className="hover:bg-blue-50/30 transition-colors group">
                       <td className="px-6 py-4">
                         <div suppressHydrationWarning className="flex items-center gap-4">
                           <div suppressHydrationWarning className={`w-12 h-12 rounded-2xl flex items-center justify-center text-white font-bold text-lg shadow-sm
                             ${idx % 4 === 0 ? 'bg-blue-500' : idx % 4 === 1 ? 'bg-emerald-500' : idx % 4 === 2 ? 'bg-indigo-500' : 'bg-rose-500'}`}>
                             {member.name.charAt(0).toUpperCase()}
                           </div>
                           <div suppressHydrationWarning>
                             <p className="font-bold text-gray-900 capitalize text-lg">{member.name}</p>
                             <p className="text-sm font-medium text-gray-500">{member.role === 'Super Admin' ? 'Super Admin' : member.role === 'Manager' ? 'Manager' : 'Member'}</p>
                           </div>
                         </div>
                       </td>
                       <td className="px-6 py-4 text-center">
                         <span className="font-bold text-gray-700 bg-gray-100 px-4 py-1.5 rounded-xl">{member.totalMeal.toFixed(2)}</span>
                       </td>
                       <td className="px-6 py-4 text-center font-bold text-emerald-600 text-lg">
                         {member.deposit.toFixed(2)} ৳
                       </td>
                       <td className="px-6 py-4 text-center font-bold text-rose-500 text-lg">
                         {member.totalCost.toFixed(2)} ৳
                       </td>
                       <td className="px-6 py-4 text-right">
                         <span className={cn(
                           "px-5 py-2 rounded-xl text-sm font-black tracking-wide",
                           member.balance >= 0 ? "bg-emerald-50 text-emerald-600" : "bg-rose-50 text-rose-600"
                         )}>
                           {member.balance > 0 ? '+' : ''}{member.balance.toFixed(2)} ৳
                         </span>
                       </td>
                     </tr>
                   ))
                 )}
               </tbody>
             </table>
           </div>
         </div>
      </div>

    </div>
  );
}
