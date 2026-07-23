"use client";

import { useState } from 'react';
import { Sidebar } from '@/components/layout/Sidebar';
import { Topbar } from '@/components/layout/Topbar';
import ChatBubble from '@/components/layout/ChatBubble';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { MessSetup } from '@/components/layout/MessSetup';
import { Loader2, ShieldAlert, RefreshCw, Phone, Info, Lock } from 'lucide-react';
import { toast } from 'react-hot-toast';

export function AppLayoutWrapper({ children }: { children: React.ReactNode }) {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [refreshingStatus, setRefreshingStatus] = useState(false);
  const pathname = usePathname();
  const { mongoUser, loading, refreshUser } = useAuth();

  const isAuthRoute = pathname === '/login' || pathname === '/register' || pathname === '/forgot-password';

  if (isAuthRoute) {
    return (
      <main className="w-full min-h-screen bg-gray-50/50 flex items-center justify-center p-4">
        {children}
      </main>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-900 via-slate-900 to-emerald-900 flex items-center justify-center text-white">
        <Loader2 className="w-10 h-10 animate-spin text-emerald-400" />
      </div>
    );
  }

  if (mongoUser && mongoUser.role !== 'Super Admin' && (!mongoUser.messId || mongoUser.role === 'Pending')) {
    return <MessSetup />;
  }

  // Global Mess Suspension Gate for non-Super Admin users
  if (mongoUser && mongoUser.role !== 'Super Admin' && mongoUser.messStatus === 'Suspended') {
    return (
      <div className="min-h-screen bg-slate-950 text-white flex flex-col items-center justify-center p-6 text-center space-y-6 relative overflow-hidden">
        {/* Ambient Glow Background */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-rose-600/10 rounded-full blur-3xl pointer-events-none"></div>
        
        <div className="relative z-10">
          <div className="w-24 h-24 bg-rose-500/10 border border-rose-500/30 rounded-3xl flex items-center justify-center shadow-2xl shadow-rose-950 mx-auto mb-2 relative">
            <ShieldAlert className="w-12 h-12 text-rose-500 animate-pulse" />
            <div className="absolute -top-1 -right-1 bg-rose-600 text-white p-1 rounded-full border border-slate-950">
              <Lock className="w-4 h-4" />
            </div>
          </div>
        </div>

        <div className="max-w-md space-y-3 relative z-10">
          <span className="px-4 py-1.5 bg-rose-500/20 text-rose-300 text-xs font-black rounded-full border border-rose-500/30 inline-flex items-center gap-1.5 uppercase tracking-widest backdrop-blur-md">
            🚫 মেস সার্ভিস স্থগিত (Suspended)
          </span>
          <h1 className="text-3xl sm:text-4xl font-black text-white tracking-tight">
            মেস অ্যাকাউন্ট সাময়িকভাবে বন্ধ রয়েছে
          </h1>
          <p className="text-slate-400 text-xs sm:text-sm leading-relaxed font-medium">
            সুপার অ্যাডমিন কর্তৃক আপনার মেসটি সাময়িকভাবে স্থগিত (Suspended) রাখা হয়েছে। স্থগিত অবস্থায় মিল এন্ট্রি, ক্যাশবুক বা বাজার ফরম অ্যাক্সেস করা সম্ভব নয়।
          </p>
        </div>

        <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 max-w-sm w-full text-left space-y-2.5 text-xs text-slate-300 font-medium relative z-10 backdrop-blur-md shadow-lg">
          <div className="flex items-center gap-2 text-rose-400 font-bold">
            <Info className="w-4 h-4" />
            <span>করণীয় সমাধান:</span>
          </div>
          <p className="pl-6 text-[11px] leading-normal text-slate-400">
            ১. আপনার মেসের সাবস্ক্রিপশন বা অ্যাডমিন ক্লিয়ারেন্স সম্পন্ন করুন।<br />
            ২. সমস্যার সমাধানে সুপার অ্যাডমিনের সাথে সরাসরি যোগাযোগ করুন।
          </p>
        </div>

        <div className="flex flex-wrap items-center justify-center gap-3.5 pt-2 relative z-10">
          <button
            type="button"
            onClick={async () => {
              setRefreshingStatus(true);
              await refreshUser();
              setRefreshingStatus(false);
              toast.success("মেস স্ট্যাটাস রিফ্রেশ করা হয়েছে!");
            }}
            disabled={refreshingStatus}
            className="px-6 py-3.5 bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold rounded-2xl text-xs flex items-center gap-2 shadow-lg shadow-indigo-600/30 transition-all disabled:opacity-50"
          >
            {refreshingStatus ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
            স্ট্যাটাস চেক করুন (Refresh)
          </button>
          <a
            href="mailto:mdrifayethossen@gmail.com"
            className="px-6 py-3.5 bg-slate-800 hover:bg-slate-700 text-slate-200 font-extrabold rounded-2xl text-xs flex items-center gap-2 border border-slate-700 transition-all"
          >
            <Phone className="w-4 h-4 text-emerald-400" />
            সাপোর্ট হেল্পলাইন
          </a>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="flex min-h-screen" suppressHydrationWarning>
        <Sidebar 
          isMobileMenuOpen={isMobileMenuOpen} 
          setIsMobileMenuOpen={setIsMobileMenuOpen} 
        />
        
        {/* Main Content Area */}
        <main className="flex-1 flex flex-col min-h-screen overflow-hidden min-w-0" suppressHydrationWarning>
          <Topbar onMenuClick={() => setIsMobileMenuOpen(true)} />
          <div className="flex-1 overflow-y-auto p-4 md:p-6 scrollbar-thin" suppressHydrationWarning>
            {children}
          </div>
        </main>
      </div>
      <ChatBubble />
    </>
  );
}
