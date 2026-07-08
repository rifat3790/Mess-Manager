"use client";

import { useEffect, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { 
  Loader2, 
  Settings2, 
  ShieldCheck, 
  ToggleLeft, 
  ToggleRight, 
  Save,
  Database,
  HardDrive,
  Activity,
  Layers,
  Files
} from 'lucide-react';
import { getSettings, updateSettings } from '../actions/settingsActions';
import { getDatabaseStats } from '../actions/adminActions';

export default function AdminPage() {
  const { user, mongoUser, loading: authLoading } = useAuth();
  const [settings, setSettings] = useState<any>(null);
  const [dbStats, setDbStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [statsLoading, setStatsLoading] = useState(true);

  async function fetchData(userId: string) {
    setLoading(true);
    const [settingsRes, statsRes] = await Promise.all([
      getSettings(userId),
      getDatabaseStats()
    ]);

    if (settingsRes.success && settingsRes.settings) {
      setSettings(settingsRes.settings.visibleTabs);
    }
    if (statsRes.success) {
      setDbStats(statsRes.stats);
    }
    setLoading(false);
    setStatsLoading(false);
  }

  useEffect(() => {
    if (mongoUser?._id) {
      fetchData(mongoUser._id);
    }
  }, [mongoUser]);

  const toggleTab = (key: string) => {
    setSettings((prev: any) => ({
      ...prev,
      [key]: !prev[key]
    }));
  };

  const saveSettings = async () => {
    if (!mongoUser?._id) return;
    setSaving(true);
    const res = await updateSettings(settings, mongoUser._id);
    if (res.success) {
      alert("সেটিংস সেভ হয়েছে!");
    } else {
      alert("সেভ করতে সমস্যা হয়েছে: " + res.error);
    }
    setSaving(false);
  };

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  if (authLoading || (loading && !settings)) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="w-10 h-10 animate-spin text-indigo-600" />
      </div>
    );
  }

  if (mongoUser?.role !== 'Super Admin') {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh]">
        <ShieldCheck className="w-16 h-16 text-rose-500 mb-4" />
        <h2 className="text-2xl font-bold text-gray-900">অ্যাক্সেস ডিনাইড</h2>
        <p className="text-gray-500 mt-2">এই পেজটি দেখার পারমিশন শুধুমাত্র সুপার অ্যাডমিনের রয়েছে।</p>
      </div>
    );
  }

  const tabs = [
    { key: 'addMeal', label: 'মিল যুক্ত' },
    { key: 'addExpense', label: 'খরচ যুক্ত' },
    { key: 'addDeposit', label: 'টাকা জমা' },
    { key: 'history', label: 'সকল মাসের হিসাব' },
    { key: 'ledger', label: 'সকল লেনদেন ও হিসাব (Ledger)' },
  ];

  return (
    <div className="w-full space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-gray-950 flex items-center gap-2">
            <Settings2 className="w-6 h-6 text-indigo-500" />
            সুপার অ্যাডমিন প্যানেল
          </h2>
          <p className="text-gray-500 text-sm mt-0.5">মেস ম্যানেজারের গ্লোবাল কনফিগারেশন এবং ডাটাবেজ সিস্টেম স্ট্যাটিস্টিকস</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Menu Configuration */}
        <div className="lg:col-span-7 bg-white rounded-3xl p-6 shadow-[0_8px_30px_rgb(0,0,0,0.03)] border border-gray-100/50 flex flex-col justify-between">
          <div className="space-y-4">
            <h3 className="font-extrabold text-gray-900 text-base mb-4 border-b border-gray-100 pb-3 flex items-center gap-2">
              <Layers className="w-5 h-5 text-indigo-500" />
              মেন্যু দৃশ্যমানতা (Tab Visibility)
            </h3>
            <p className="text-xs text-gray-400 font-medium">সাধারণ মেম্বারদের জন্য কোন কোন মেন্যু/ট্যাবগুলো বামপাশের সাইডবারে দেখা যাবে তা এখান থেকে কন্ট্রোল করুন।</p>
            
            <div className="space-y-3 pt-3">
              {tabs.map((tab) => (
                <div key={tab.key} className="flex items-center justify-between p-3.5 bg-gray-50/50 hover:bg-gray-50 border border-gray-100 rounded-2xl transition-all">
                  <span className="text-gray-800 text-sm font-bold capitalize">{tab.label}</span>
                  <button 
                    onClick={() => toggleTab(tab.key)}
                    className={`flex items-center transition-all ${settings[tab.key] ? 'text-emerald-500' : 'text-gray-400'}`}
                  >
                    {settings[tab.key] ? (
                      <ToggleRight className="w-9 h-9" />
                    ) : (
                      <ToggleLeft className="w-9 h-9" />
                    )}
                  </button>
                </div>
              ))}
            </div>
          </div>

          <div className="pt-6 mt-6 border-t border-gray-100">
            <button 
              onClick={saveSettings}
              disabled={saving}
              className="w-full py-3.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl font-bold transition-all flex items-center justify-center gap-2 disabled:opacity-50 shadow-md shadow-indigo-100 hover:shadow-lg hover:shadow-indigo-200"
            >
              {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
              কনফিগারেশন সেভ করুন
            </button>
          </div>
        </div>

        {/* Right Column: Database Storage Analytics */}
        <div className="lg:col-span-5 bg-white rounded-3xl p-6 shadow-[0_8px_30px_rgb(0,0,0,0.03)] border border-gray-100/50">
          <h3 className="font-extrabold text-gray-900 text-base mb-4 border-b border-gray-100 pb-3 flex items-center gap-2">
            <Database className="w-5 h-5 text-indigo-500" />
            MongoDB স্টোরেজ এনালাইটিক্স
          </h3>

          {statsLoading || !dbStats ? (
            <div className="flex flex-col items-center justify-center py-16 text-gray-400">
              <Loader2 className="w-8 h-8 animate-spin text-indigo-500 mb-2" />
              <p className="text-xs font-semibold">ডাটাবেজ এনালাইসিস হচ্ছে...</p>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Storage Space Progress Card */}
              <div className="bg-gradient-to-br from-indigo-950 via-slate-900 to-slate-950 text-white p-5 rounded-2xl border border-slate-800 relative overflow-hidden">
                <div className="absolute top-0 right-0 p-3 opacity-5 pointer-events-none">
                  <HardDrive className="w-20 h-20 text-white animate-pulse" />
                </div>
                
                <span className="text-[10px] font-bold text-indigo-300 tracking-wider uppercase">মোট স্টোরেজ ব্যবহার (M0 Free Tier)</span>
                <div className="flex items-baseline gap-1.5 mt-2 mb-4">
                  <span className="text-2xl font-black">{formatBytes(dbStats.totalUsedBytes)}</span>
                  <span className="text-[10px] text-gray-400 font-bold">/ {formatBytes(dbStats.totalLimitBytes)}</span>
                </div>

                {/* Progress bar */}
                <div className="space-y-1">
                  <div className="w-full bg-slate-800 rounded-full h-2.5 overflow-hidden">
                    <div 
                      className={`h-full rounded-full transition-all duration-500 ${
                        Number(dbStats.percentUsed) > 80 ? 'bg-rose-500 animate-pulse' : Number(dbStats.percentUsed) > 50 ? 'bg-amber-500' : 'bg-emerald-500'
                      }`}
                      style={{ width: `${dbStats.percentUsed}%` }}
                    />
                  </div>
                  <div className="flex justify-between text-[10px] text-gray-400 font-bold">
                    <span>{dbStats.percentUsed}% ব্যবহৃত</span>
                    <span>অব্যবহৃত: {formatBytes(dbStats.freeSpaceBytes)}</span>
                  </div>
                </div>
              </div>

              {/* Detail Stats Grid */}
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 bg-gray-50 border border-gray-100 rounded-2xl flex flex-col">
                  <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">ডাটা সাইজ (Logical)</span>
                  <span className="text-sm font-black text-gray-800 mt-1">{formatBytes(dbStats.dataSizeBytes)}</span>
                </div>
                <div className="p-3 bg-gray-50 border border-gray-100 rounded-2xl flex flex-col">
                  <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">ইনডেক্স সাইজ</span>
                  <span className="text-sm font-black text-gray-800 mt-1">{formatBytes(dbStats.indexSizeBytes)}</span>
                </div>
                <div className="p-3 bg-gray-50 border border-gray-100 rounded-2xl flex flex-col">
                  <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">মোট কালেকশন</span>
                  <span className="text-sm font-black text-gray-800 mt-1">{dbStats.collectionsCount} টি</span>
                </div>
                <div className="p-3 bg-gray-50 border border-gray-100 rounded-2xl flex flex-col">
                  <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">মোট ডাটা অবজেক্টস</span>
                  <span className="text-sm font-black text-gray-800 mt-1">{dbStats.objectsCount} টি</span>
                </div>
              </div>

              {/* Status Alert Badge */}
              <div className="bg-emerald-50 border border-emerald-100 p-4.5 rounded-2xl flex items-start gap-3">
                <Activity className="w-5 h-5 text-emerald-500 flex-shrink-0 mt-0.5" />
                <div>
                  <h4 className="text-xs font-extrabold text-emerald-800">ডাটাবেজ স্বাস্থ্য চমৎকার!</h4>
                  <p className="text-[10px] font-semibold text-emerald-600/80 mt-0.5">
                    আপনার ক্লাউড ডাটাবেজে {formatBytes(dbStats.freeSpaceBytes)} ফাঁকা জায়গা অবশিষ্ট আছে, যা এই মেসের দীর্ঘকালীন ডাটা পরিচালনার জন্য পর্যাপ্ত।
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
