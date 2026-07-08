"use client";

import { useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { createMess, joinMess } from '@/app/actions/messActions';
import { auth } from '@/lib/firebase';
import { signOut } from 'firebase/auth';
import { Home, UserPlus, LogOut, Loader2, Sparkles, CheckCircle2, ShieldAlert } from 'lucide-react';
import { toast } from 'react-hot-toast';

export function MessSetup() {
  const { mongoUser, refreshUser } = useAuth();
  const [activeTab, setActiveTab] = useState<'create' | 'join'>('create');
  const [messName, setMessName] = useState('');
  const [messCode, setMessCode] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleLogout = async () => {
    try {
      await signOut(auth);
      toast.success("সফলভাবে লগআউট করা হয়েছে");
      window.location.reload();
    } catch {
      toast.error("লগআউট করতে সমস্যা হয়েছে");
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!messName.trim()) {
      toast.error("মেসের নাম লিখুন");
      return;
    }
    setSubmitting(true);
    try {
      const res = await createMess(messName.trim(), mongoUser!._id);
      if (res.success) {
        toast.success("মেস সফলভাবে তৈরি করা হয়েছে!");
        await refreshUser();
      } else {
        toast.error(res.error || "মেস তৈরি করা সম্ভব হয়নি");
      }
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : String(err);
      toast.error("ত্রুটি ঘটেছে: " + errMsg);
    } finally {
      setSubmitting(false);
    }
  };

  const handleJoin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!messCode.trim()) {
      toast.error("মেস কোড লিখুন");
      return;
    }
    setSubmitting(true);
    try {
      const res = await joinMess(messCode.trim(), mongoUser!._id);
      if (res.success) {
        toast.success("মেসে জয়েন করার অনুরোধ পাঠানো হয়েছে!");
        await refreshUser();
      } else {
        toast.error(res.error || "অনুরোধ পাঠানো সম্ভব হয়নি");
      }
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : String(err);
      toast.error("ত্রুটি ঘটেছে: " + errMsg);
    } finally {
      setSubmitting(false);
    }
  };

  // If role is Pending and they joined a mess, they are waiting for manager approval
  if (mongoUser?.role === 'Pending' && mongoUser?.messId) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-900 via-slate-900 to-emerald-900 flex items-center justify-center p-4">
        <div className="bg-white/10 backdrop-blur-xl border border-white/20 p-8 rounded-2xl w-full max-w-md shadow-2xl text-center text-white relative overflow-hidden">
          <div className="absolute -top-10 -right-10 w-40 h-40 bg-emerald-500/10 rounded-full blur-2xl"></div>
          
          <ShieldAlert className="w-16 h-16 text-amber-400 mx-auto mb-6 animate-pulse" />
          
          <h2 className="text-2xl font-bold mb-3 tracking-wide">অনুমোদনের জন্য অপেক্ষা করুন</h2>
          <p className="text-slate-300 text-sm leading-relaxed mb-6">
            আপনার জয়েনিং রিকোয়েস্টটি মেস ম্যানেজারের কাছে পেন্ডিং অবস্থায় রয়েছে। ম্যানেজার অনুমোদন দিলে আপনি ড্যাশবোর্ডে প্রবেশ করতে পারবেন।
          </p>

          <div className="bg-white/5 border border-white/10 p-4 rounded-xl mb-6 text-left">
            <div className="text-xs text-slate-400">অনুরোধকারী প্রোফাইল:</div>
            <div className="font-semibold text-emerald-400 mt-1">{mongoUser.name}</div>
            <div className="text-xs text-slate-300">{mongoUser.email}</div>
          </div>

          <div className="flex flex-col gap-3">
            <button
              onClick={refreshUser}
              disabled={submitting}
              className="w-full bg-emerald-500 hover:bg-emerald-600 disabled:opacity-50 text-white font-medium py-3 rounded-xl transition duration-200 flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/20"
            >
              {submitting ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <Sparkles className="w-5 h-5" />
              )}
              রিফ্রেশ করুন / চেক করুন
            </button>

            <button
              onClick={handleLogout}
              className="w-full bg-white/10 hover:bg-white/20 text-white font-medium py-3 rounded-xl transition duration-200 flex items-center justify-center gap-2"
            >
              <LogOut className="w-5 h-5" />
              লগআউট করুন
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-900 via-slate-900 to-emerald-900 flex items-center justify-center p-4">
      <div className="bg-white/10 backdrop-blur-xl border border-white/20 p-8 rounded-2xl w-full max-w-md shadow-2xl text-white relative overflow-hidden">
        <div className="absolute -top-10 -right-10 w-45 h-45 bg-indigo-500/20 rounded-full blur-3xl"></div>
        <div className="absolute -bottom-10 -left-10 w-45 h-45 bg-emerald-500/20 rounded-full blur-3xl"></div>

        <div className="text-center mb-8">
          <h1 className="text-3xl font-extrabold tracking-wide mb-2">মেস ম্যানেজার</h1>
          <p className="text-slate-300 text-xs">আপনার গ্লোবাল মেস ম্যানেজমেন্ট হাব</p>
        </div>

        {/* Tab Buttons */}
        <div className="flex bg-white/5 border border-white/10 p-1 rounded-xl mb-6">
          <button
            onClick={() => setActiveTab('create')}
            className={`flex-1 py-2.5 rounded-lg text-sm font-semibold transition-all duration-300 flex items-center justify-center gap-2 ${
              activeTab === 'create' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-400 hover:text-white'
            }`}
          >
            <Home className="w-4 h-4" />
            নতুন মেস খুলুন
          </button>
          <button
            onClick={() => setActiveTab('join')}
            className={`flex-1 py-2.5 rounded-lg text-sm font-semibold transition-all duration-300 flex items-center justify-center gap-2 ${
              activeTab === 'join' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-400 hover:text-white'
            }`}
          >
            <UserPlus className="w-4 h-4" />
            মেসে জয়েন করুন
          </button>
        </div>

        {/* Content Tabs */}
        {activeTab === 'create' ? (
          <form onSubmit={handleCreate} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5">মেসের নাম:</label>
              <input
                type="text"
                placeholder="যেমন: ইউনিকোরন ছাত্রাবাস"
                value={messName}
                onChange={(e) => setMessName(e.target.value)}
                disabled={submitting}
                className="w-full bg-white/5 border border-white/10 focus:border-indigo-500 rounded-xl px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 text-sm transition"
              />
            </div>
            <button
              type="submit"
              disabled={submitting}
              className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-medium py-3 rounded-xl transition duration-200 flex items-center justify-center gap-2 shadow-lg shadow-indigo-600/25"
            >
              {submitting ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <CheckCircle2 className="w-5 h-5" />
              )}
              তৈরি করুন (মেস ম্যানেজার হিসেবে)
            </button>
          </form>
        ) : (
          <form onSubmit={handleJoin} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5">ইউনিক মেস কোড (৬ ডিজিট):</label>
              <input
                type="text"
                maxLength={6}
                placeholder="যেমন: AB12CD"
                value={messCode}
                onChange={(e) => setMessCode(e.target.value.toUpperCase())}
                disabled={submitting}
                className="w-full bg-white/5 border border-white/10 focus:border-indigo-500 rounded-xl px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 text-sm tracking-widest text-center uppercase transition"
              />
            </div>
            <button
              type="submit"
              disabled={submitting}
              className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-medium py-3 rounded-xl transition duration-200 flex items-center justify-center gap-2 shadow-lg shadow-indigo-600/25"
            >
              {submitting ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <UserPlus className="w-5 h-5" />
              )}
              জয়েনিং রিকোয়েস্ট পাঠান
            </button>
          </form>
        )}

        <div className="mt-8 pt-6 border-t border-white/10 flex items-center justify-between text-xs text-slate-400">
          <span>প্রোফাইল: {mongoUser?.name}</span>
          <button
            onClick={handleLogout}
            className="flex items-center gap-1 hover:text-red-400 transition"
          >
            <LogOut className="w-3.5 h-3.5" />
            লগআউট
          </button>
        </div>
      </div>
    </div>
  );
}
