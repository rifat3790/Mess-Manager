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
  Building2,
  Users,
  Megaphone,
  Search,
  Check,
  X,
  Sparkles,
  TrendingUp,
  Coins,
  Utensils,
  RefreshCw,
  Send,
  UserCheck,
  ShieldAlert,
  Download
} from 'lucide-react';
import { getSettings, updateSettings } from '../actions/settingsActions';
import { 
  getDatabaseStats, 
  getSuperAdminDashboardData, 
  broadcastSystemAnnouncement, 
  updateMessStatus, 
  updateUserRoleAndPermissions 
} from '../actions/adminActions';
import { toast } from 'react-hot-toast';

export default function AdminPage() {
  const { user, mongoUser, loading: authLoading } = useAuth();
  
  const [activeTab, setActiveTab] = useState<'overview' | 'messes' | 'users' | 'broadcast' | 'database' | 'settings'>('overview');
  
  // Data States
  const [settings, setSettings] = useState<any>(null);
  const [dbStats, setDbStats] = useState<any>(null);
  const [superAdminData, setSuperAdminData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Search & Filter
  const [messSearch, setMessSearch] = useState('');
  const [userSearch, setUserSearch] = useState('');
  const [userRoleFilter, setUserRoleFilter] = useState<string>('All');

  // Broadcast Announcement State
  const [broadcastTitle, setBroadcastTitle] = useState('');
  const [broadcastMessage, setBroadcastMessage] = useState('');
  const [broadcastTarget, setBroadcastTarget] = useState('ALL');
  const [broadcasting, setBroadcasting] = useState(false);

  // User Role Editing State
  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  const [selectedRole, setSelectedRole] = useState<'Super Admin' | 'Manager' | 'Member' | 'Pending'>('Member');
  const [roleActionLoading, setRoleActionLoading] = useState(false);

  // Mess Action Loading
  const [messActionLoading, setMessActionLoading] = useState<Record<string, boolean>>({});

  async function fetchAllAdminData() {
    if (!mongoUser?._id) return;
    setLoading(true);
    try {
      const [settingsRes, saDataRes] = await Promise.all([
        getSettings(mongoUser._id),
        getSuperAdminDashboardData(mongoUser._id)
      ]);

      if (settingsRes.success && settingsRes.settings) {
        setSettings(settingsRes.settings.visibleTabs);
      }
      if (saDataRes.success) {
        setSuperAdminData(saDataRes);
        if (saDataRes.dbStats) {
          setDbStats(saDataRes.dbStats);
        }
      } else {
        toast.error(saDataRes.error || "সুপার অ্যাডমিন ডাটা লোড হয়নি");
      }
    } catch (err: any) {
      toast.error("ত্রুটি ঘটেছে: " + err.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (mongoUser?._id && mongoUser.role === 'Super Admin') {
      fetchAllAdminData();
    }
  }, [mongoUser]);

  const toggleTabSetting = (key: string) => {
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
      toast.success("সেটিংস সফলভাবে সেভ হয়েছে!");
    } else {
      toast.error("সেভ করতে সমস্যা হয়েছে: " + res.error);
    }
    setSaving(false);
  };

  const handleBroadcast = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!broadcastTitle.trim() || !broadcastMessage.trim() || !mongoUser?._id) {
      toast.error("শিরোনাম এবং মেসেজ পূরণ করুন");
      return;
    }

    try {
      setBroadcasting(true);
      const res = await broadcastSystemAnnouncement(mongoUser._id, broadcastTitle, broadcastMessage, broadcastTarget);
      if (res.success) {
        toast.success("সিস্টেম ব্রডকাস্ট নোটিশ সফলভাবে পাঠানো হয়েছে!");
        setBroadcastTitle('');
        setBroadcastMessage('');
      } else {
        toast.error(res.error || "নোটিশ পাঠাতে ব্যর্থ");
      }
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setBroadcasting(false);
    }
  };

  const handleToggleMessStatus = async (messId: string, currentStatus: string) => {
    if (!mongoUser?._id) return;
    const newStatus = currentStatus === 'Suspended' ? 'Active' : 'Suspended';
    try {
      setMessActionLoading(prev => ({ ...prev, [messId]: true }));
      const res = await updateMessStatus(mongoUser._id, messId, newStatus);
      if (res.success) {
        toast.success(`মেস স্ট্যাটাস ${newStatus} করা হয়েছে`);
        fetchAllAdminData();
      } else {
        toast.error(res.error || "স্ট্যাটাস পরিবর্তন ব্যর্থ");
      }
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setMessActionLoading(prev => ({ ...prev, [messId]: false }));
    }
  };

  const handleUpdateRole = async (targetUserId: string) => {
    if (!mongoUser?._id) return;
    try {
      setRoleActionLoading(true);
      const res = await updateUserRoleAndPermissions(mongoUser._id, targetUserId, selectedRole);
      if (res.success) {
        toast.success("ইউজার রোল সফলভাবে আপডেট হয়েছে!");
        setEditingUserId(null);
        fetchAllAdminData();
      } else {
        toast.error(res.error || "রোল আপডেট ব্যর্থ");
      }
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setRoleActionLoading(false);
    }
  };

  const formatBytes = (bytes: number) => {
    if (!bytes || bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  if (authLoading || (loading && !superAdminData)) {
    return (
      <div className="flex flex-col justify-center items-center h-80 gap-3">
        <Loader2 className="w-10 h-10 animate-spin text-indigo-600" />
        <p className="text-sm font-semibold text-gray-500">সুপার অ্যাডমিন ড্যাশবোর্ড লোড হচ্ছে...</p>
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

  const tabList = [
    { key: 'addMeal', label: 'মিল যুক্ত' },
    { key: 'addExpense', label: 'খরচ যুক্ত' },
    { key: 'addDeposit', label: 'টাকা জমা' },
    { key: 'history', label: 'সকল মাসের হিসাব' },
    { key: 'ledger', label: 'সকল লেনদেন ও হিসাব (Ledger)' },
  ];

  const filteredMesses = (superAdminData?.messes || []).filter((m: any) => 
    m.name?.toLowerCase().includes(messSearch.toLowerCase()) || 
    m.code?.toLowerCase().includes(messSearch.toLowerCase()) ||
    m.creatorId?.email?.toLowerCase().includes(messSearch.toLowerCase())
  );

  const filteredUsers = (superAdminData?.users || []).filter((u: any) => {
    const matchesSearch = u.name?.toLowerCase().includes(userSearch.toLowerCase()) ||
                          u.email?.toLowerCase().includes(userSearch.toLowerCase());
    const matchesRole = userRoleFilter === 'All' || u.role === userRoleFilter;
    return matchesSearch && matchesRole;
  });

  return (
    <div className="w-full space-y-6 pb-16">
      {/* Header Banner */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-indigo-950 via-slate-900 to-indigo-900 text-white p-6 shadow-xl border border-indigo-800/40">
        <div className="absolute top-0 right-0 p-4 opacity-10 pointer-events-none">
          <Sparkles className="w-48 h-48 text-indigo-400" />
        </div>
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 relative z-10">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/20 border border-indigo-400/30 text-indigo-300 text-xs font-bold mb-2">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              সুপার অ্যাডমিন কমান্ড সেন্টার
            </div>
            <h1 className="text-2xl font-black text-white tracking-tight">সিস্টেম গ্লোবাল ড্যাশবোর্ড</h1>
            <p className="text-indigo-200/80 text-xs mt-1">সমগ্র প্ল্যাটফর্মের সকল মেস, ইউজার, ফাইন্যান্সিয়াল এনালাইটিক্স এবং সিস্টেম কন্ট্রোল প্যানেল</p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={fetchAllAdminData}
              className="px-4 py-2.5 bg-white/10 hover:bg-white/20 text-white rounded-xl text-xs font-bold transition-all flex items-center gap-2 backdrop-blur-md border border-white/10"
            >
              <RefreshCw className="w-4 h-4" />
              রিফ্রেশ ডাটা
            </button>
          </div>
        </div>
      </div>

      {/* Metric Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-3xl border border-gray-100 shadow-[0_8px_30px_rgb(0,0,0,0.02)] flex items-center justify-between">
          <div>
            <span className="text-xs font-extrabold text-gray-400 uppercase tracking-wider">মোট নিবন্ধিত মেস</span>
            <h3 className="text-2xl font-black text-gray-900 mt-1">{superAdminData?.messesCount || 0} টি</h3>
            <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-md mt-1 inline-block">
              {superAdminData?.messes?.filter((m: any) => m.status !== 'Suspended').length || 0} টি সচল
            </span>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-indigo-50 flex items-center justify-center text-indigo-600">
            <Building2 className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white p-5 rounded-3xl border border-gray-100 shadow-[0_8px_30px_rgb(0,0,0,0.02)] flex items-center justify-between">
          <div>
            <span className="text-xs font-extrabold text-gray-400 uppercase tracking-wider">মোট ইউজার সংখ্যা</span>
            <h3 className="text-2xl font-black text-gray-900 mt-1">{superAdminData?.usersCount || 0} জন</h3>
            <span className="text-[10px] font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-md mt-1 inline-block">
              প্ল্যাটফর্ম ইউজার্স
            </span>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-blue-50 flex items-center justify-center text-blue-600">
            <Users className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white p-5 rounded-3xl border border-gray-100 shadow-[0_8px_30px_rgb(0,0,0,0.02)] flex items-center justify-between">
          <div>
            <span className="text-xs font-extrabold text-gray-400 uppercase tracking-wider">মোট প্ল্যাটফর্ম জমা</span>
            <h3 className="text-2xl font-black text-emerald-600 mt-1">৳{(superAdminData?.systemTotals?.totalDeposits || 0).toLocaleString()}</h3>
            <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-md mt-1 inline-block">
              মোট ক্যাশ-ইন
            </span>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-emerald-50 flex items-center justify-center text-emerald-600">
            <Coins className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white p-5 rounded-3xl border border-gray-100 shadow-[0_8px_30px_rgb(0,0,0,0.02)] flex items-center justify-between">
          <div>
            <span className="text-xs font-extrabold text-gray-400 uppercase tracking-wider">মোট পরিবেশনকৃত মিল</span>
            <h3 className="text-2xl font-black text-amber-600 mt-1">{(superAdminData?.systemTotals?.totalMeals || 0).toLocaleString()} টি</h3>
            <span className="text-[10px] font-bold text-amber-600 bg-amber-50 px-2 py-0.5 rounded-md mt-1 inline-block">
              গ্লোবাল হিসাব
            </span>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-amber-50 flex items-center justify-center text-amber-600">
            <Utensils className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* Tab Navigation Controls */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 border-b border-gray-200/80">
        {[
          { id: 'overview', label: 'গ্লোবাল ওভারভিউ', icon: Activity },
          { id: 'messes', label: `মেস ম্যানেজার্স (${superAdminData?.messesCount || 0})`, icon: Building2 },
          { id: 'users', label: `ইউজার ডিরেক্টরি (${superAdminData?.usersCount || 0})`, icon: Users },
          { id: 'broadcast', label: 'ব্রডকাস্ট নোটিশ', icon: Megaphone },
          { id: 'database', label: 'MongoDB হেলথ', icon: Database },
          { id: 'settings', label: 'সাইডবার ট্যাব দৃশ্যমানতা', icon: Layers },
        ].map(tab => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`px-4 py-2.5 rounded-2xl text-xs font-bold transition-all flex items-center gap-2 flex-shrink-0 ${
                isActive 
                  ? 'bg-indigo-600 text-white shadow-md shadow-indigo-100' 
                  : 'bg-white text-gray-600 hover:bg-gray-50 border border-gray-100'
              }`}
            >
              <Icon className="w-4 h-4" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* TAB 1: OVERVIEW */}
      {activeTab === 'overview' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Quick Actions & System Info */}
          <div className="lg:col-span-7 bg-white rounded-3xl p-6 border border-gray-100 shadow-[0_8px_30px_rgb(0,0,0,0.02)] space-y-6">
            <h3 className="font-extrabold text-gray-900 text-base border-b border-gray-100 pb-3 flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-indigo-500" />
              সিস্টেম লাইভ অ্যাক্টিভিটি ও সামারি
            </h3>

            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 bg-gray-50 rounded-2xl border border-gray-100">
                <span className="text-xs font-extrabold text-gray-400 uppercase">মোট খরচ ড্যাপ</span>
                <p className="text-xl font-black text-rose-600 mt-1">৳{(superAdminData?.systemTotals?.totalExpenses || 0).toLocaleString()}</p>
                <p className="text-[10px] text-gray-400 font-semibold mt-0.5">সকল মেসের সম্মিলিত ব্যালেন্স খরচ</p>
              </div>
              <div className="p-4 bg-gray-50 rounded-2xl border border-gray-100">
                <span className="text-xs font-extrabold text-gray-400 uppercase">ডাটাবেজ স্টোরেজ ব্যবহার</span>
                <p className="text-xl font-black text-indigo-600 mt-1">{dbStats?.percentUsed || 0}%</p>
                <p className="text-[10px] text-gray-400 font-semibold mt-0.5">MongoDB Free Tier স্টোরেজ</p>
              </div>
            </div>

            {/* Recent Registered Messes Preview */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <h4 className="text-xs font-extrabold text-gray-700 uppercase">সর্বশেষ নিবন্ধিত মেসসমূহ</h4>
                <button onClick={() => setActiveTab('messes')} className="text-xs font-bold text-indigo-600 hover:underline">সবগুলো দেখুন →</button>
              </div>
              <div className="space-y-2">
                {(superAdminData?.messes || []).slice(0, 4).map((m: any) => (
                  <div key={m._id} className="p-3.5 bg-gray-50/70 rounded-2xl border border-gray-100 flex items-center justify-between">
                    <div>
                      <span className="font-extrabold text-gray-900 text-sm">{m.name}</span>
                      <div className="flex items-center gap-2 text-xs text-gray-500 mt-0.5">
                        <span className="font-mono bg-gray-200 px-1.5 py-0.5 rounded text-[10px] font-bold text-gray-700">{m.code}</span>
                        <span>• ক্রিয়েটর: {m.creatorId?.name || m.creatorId?.email || 'অজানা'}</span>
                      </div>
                    </div>
                    <span className="text-xs font-extrabold text-gray-700 bg-white border border-gray-200 px-2.5 py-1 rounded-xl">
                      {m.memberCount} মেম্বার
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Quick Broadcast Notification Widget */}
          <div className="lg:col-span-5 bg-gradient-to-br from-slate-900 to-indigo-950 text-white rounded-3xl p-6 shadow-xl border border-indigo-900/40 flex flex-col justify-between">
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <Megaphone className="w-6 h-6 text-amber-400" />
                <div>
                  <h3 className="font-extrabold text-base text-white">ইনস্ট্যান্ট ব্রডকাস্ট নোটিশ</h3>
                  <p className="text-[11px] text-indigo-200/70">সকল মেসের মেম্বারদের সাইডবার নোটিফিকেশনে বার্তা পাঠান</p>
                </div>
              </div>

              <div className="space-y-3 pt-2">
                <input
                  type="text"
                  placeholder="নোটিশের শিরোনাম..."
                  value={broadcastTitle}
                  onChange={(e) => setBroadcastTitle(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-white/10 border border-white/10 rounded-xl text-xs text-white placeholder-gray-400 focus:outline-none focus:border-indigo-400"
                />
                <textarea
                  rows={3}
                  placeholder="নোটিশের বিস্তারিত বিবরণ..."
                  value={broadcastMessage}
                  onChange={(e) => setBroadcastMessage(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-white/10 border border-white/10 rounded-xl text-xs text-white placeholder-gray-400 focus:outline-none focus:border-indigo-400"
                />
              </div>
            </div>

            <button
              onClick={handleBroadcast}
              disabled={broadcasting}
              className="w-full mt-4 py-3 bg-indigo-500 hover:bg-indigo-600 text-white font-extrabold rounded-xl text-xs transition-all flex items-center justify-center gap-2 shadow-lg disabled:opacity-50"
            >
              {broadcasting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              সকল মেসে নোটিশ পাঠান
            </button>
          </div>
        </div>
      )}

      {/* TAB 2: MESSES MANAGEMENT */}
      {activeTab === 'messes' && (
        <div className="bg-white rounded-3xl p-6 border border-gray-100 shadow-[0_8px_30px_rgb(0,0,0,0.02)] space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-gray-100 pb-4">
            <div>
              <h3 className="font-extrabold text-gray-900 text-base flex items-center gap-2">
                <Building2 className="w-5 h-5 text-indigo-500" />
                নিবন্ধিত মেস ম্যানেজমেন্ট ম্যাট্রিক্স
              </h3>
              <p className="text-xs text-gray-400 mt-0.5">সকল সিস্টেম মেসের বিবরণ, মেম্বার সংখ্যা ও অ্যাক্টিভেশন স্ট্যাটাস</p>
            </div>

            <div className="relative w-full sm:w-64">
              <Search className="w-4 h-4 text-gray-400 absolute left-3 top-3" />
              <input
                type="text"
                placeholder="মেস নাম বা কোড খুঁজুন..."
                value={messSearch}
                onChange={(e) => setMessSearch(e.target.value)}
                className="w-full pl-9 pr-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs focus:outline-none focus:border-indigo-500 font-semibold"
              />
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-gray-50 text-gray-500 font-extrabold border-b border-gray-100">
                  <th className="p-3 rounded-l-xl">মেসের নাম</th>
                  <th className="p-3">মেস কোড</th>
                  <th className="p-3">ক্রিয়েটর তথ্য</th>
                  <th className="p-3">মেম্বার সংখ্যা</th>
                  <th className="p-3">তৈরির তারিখ</th>
                  <th className="p-3">স্ট্যাটাস</th>
                  <th className="p-3 rounded-r-xl text-right">অ্যাকশন</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredMesses.map((m: any) => (
                  <tr key={m._id} className="hover:bg-gray-50/80 transition-all font-semibold text-gray-800">
                    <td className="p-3 font-extrabold text-gray-900">{m.name}</td>
                    <td className="p-3 font-mono font-bold text-indigo-600">{m.code}</td>
                    <td className="p-3 text-gray-600">
                      <div>{m.creatorId?.name || 'অজানা'}</div>
                      <div className="text-[10px] text-gray-400">{m.creatorId?.email}</div>
                    </td>
                    <td className="p-3">
                      <span className="bg-indigo-50 text-indigo-700 px-2 py-1 rounded-lg font-bold">
                        {m.memberCount} জন
                      </span>
                    </td>
                    <td className="p-3 text-gray-500">
                      {m.createdAt ? new Date(m.createdAt).toLocaleDateString('en-GB') : 'অজানা'}
                    </td>
                    <td className="p-3">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold ${
                        m.status === 'Suspended' ? 'bg-rose-100 text-rose-700' : 'bg-emerald-100 text-emerald-700'
                      }`}>
                        {m.status === 'Suspended' ? 'স্থগিত (Suspended)' : 'সচল (Active)'}
                      </span>
                    </td>
                    <td className="p-3 text-right">
                      <button
                        onClick={() => handleToggleMessStatus(m._id, m.status)}
                        disabled={messActionLoading[m._id]}
                        className={`px-3 py-1.5 rounded-xl font-bold transition-all text-[11px] disabled:opacity-50 ${
                          m.status === 'Suspended' 
                            ? 'bg-emerald-600 text-white hover:bg-emerald-700' 
                            : 'bg-rose-50 text-rose-600 hover:bg-rose-100 border border-rose-200'
                        }`}
                      >
                        {messActionLoading[m._id] ? 'আপডেট হচ্ছে...' : m.status === 'Suspended' ? 'সচল করুন' : 'সাসপেন্ড করুন'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 3: USERS DIRECTORY & ROLE MANAGER */}
      {activeTab === 'users' && (
        <div className="bg-white rounded-3xl p-6 border border-gray-100 shadow-[0_8px_30px_rgb(0,0,0,0.02)] space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-gray-100 pb-4">
            <div>
              <h3 className="font-extrabold text-gray-900 text-base flex items-center gap-2">
                <Users className="w-5 h-5 text-indigo-500" />
                সিস্টেম গ্লোবাল ইউজার ডিরেক্টরি
              </h3>
              <p className="text-xs text-gray-400 mt-0.5">সকল ইউজারের তালিকা, মেস নাম ও গ্লোবাল রোল ম্যানেজমেন্ট</p>
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto">
              <select
                value={userRoleFilter}
                onChange={(e) => setUserRoleFilter(e.target.value)}
                className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs font-extrabold text-gray-700 focus:outline-none"
              >
                <option value="All">সকল রোল</option>
                <option value="Super Admin">Super Admin</option>
                <option value="Manager">Manager</option>
                <option value="Member">Member</option>
                <option value="Pending">Pending</option>
              </select>

              <div className="relative w-full sm:w-56">
                <Search className="w-4 h-4 text-gray-400 absolute left-3 top-3" />
                <input
                  type="text"
                  placeholder="ইউজার নাম বা ইমেইল..."
                  value={userSearch}
                  onChange={(e) => setUserSearch(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs focus:outline-none focus:border-indigo-500 font-semibold"
                />
              </div>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-gray-50 text-gray-500 font-extrabold border-b border-gray-100">
                  <th className="p-3 rounded-l-xl">ইউজার তথ্য</th>
                  <th className="p-3">ইমেইল এড্রেস</th>
                  <th className="p-3">মেস নাম</th>
                  <th className="p-3">বর্তমান রোল</th>
                  <th className="p-3 rounded-r-xl text-right">রোল অ্যাকশন</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredUsers.map((u: any) => (
                  <tr key={u._id} className="hover:bg-gray-50/80 transition-all font-semibold text-gray-800">
                    <td className="p-3">
                      <div className="font-extrabold text-gray-900">{u.name}</div>
                      <div className="text-[10px] text-gray-400">ID: {u._id}</div>
                    </td>
                    <td className="p-3 text-gray-600 font-mono text-[11px]">{u.email}</td>
                    <td className="p-3">
                      <span className="font-bold text-gray-800">{u.messId?.name || 'কোনো মেসে নাই'}</span>
                    </td>
                    <td className="p-3">
                      <span className={`px-2.5 py-1 rounded-full text-[10px] font-extrabold ${
                        u.role === 'Super Admin' 
                          ? 'bg-purple-100 text-purple-700 border border-purple-200' 
                          : u.role === 'Manager' 
                          ? 'bg-indigo-100 text-indigo-700' 
                          : 'bg-gray-100 text-gray-700'
                      }`}>
                        {u.role}
                      </span>
                    </td>
                    <td className="p-3 text-right">
                      {editingUserId === u._id ? (
                        <div className="flex items-center justify-end gap-1.5">
                          <select
                            value={selectedRole}
                            onChange={(e) => setSelectedRole(e.target.value as any)}
                            className="px-2 py-1 bg-white border border-indigo-300 rounded-lg text-xs font-bold text-gray-800 focus:outline-none"
                          >
                            <option value="Super Admin">Super Admin</option>
                            <option value="Manager">Manager</option>
                            <option value="Member">Member</option>
                            <option value="Pending">Pending</option>
                          </select>
                          <button
                            onClick={() => handleUpdateRole(u._id)}
                            disabled={roleActionLoading}
                            className="px-2.5 py-1 bg-emerald-600 text-white rounded-lg text-xs font-bold hover:bg-emerald-700"
                          >
                            সেভ
                          </button>
                          <button
                            onClick={() => setEditingUserId(null)}
                            className="px-2 py-1 bg-gray-200 text-gray-700 rounded-lg text-xs font-bold hover:bg-gray-300"
                          >
                            ক্যানসেল
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => {
                            setEditingUserId(u._id);
                            setSelectedRole(u.role);
                          }}
                          className="px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl text-[11px] font-extrabold transition-all"
                        >
                          রোল পরিবর্তন
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 4: BROADCAST ANNOUNCEMENT */}
      {activeTab === 'broadcast' && (
        <div className="bg-white rounded-3xl p-6 border border-gray-100 shadow-[0_8px_30px_rgb(0,0,0,0.02)] space-y-6">
          <div className="border-b border-gray-100 pb-4">
            <h3 className="font-extrabold text-gray-900 text-base flex items-center gap-2">
              <Megaphone className="w-5 h-5 text-indigo-500" />
              সিস্টেম-ওয়াইড ব্রডকাস্ট এনাউন্সমেন্ট
            </h3>
            <p className="text-xs text-gray-400 mt-0.5">সকল মেসের সাইডবারে রিয়েল-টাইম পুশ নোটিফিকেশন মেসেজ পাঠান</p>
          </div>

          <form onSubmit={handleBroadcast} className="space-y-4 max-w-2xl">
            <div>
              <label className="block text-xs font-extrabold text-gray-700 mb-1">প্রাপক মেস (Recipient Mess)</label>
              <select
                value={broadcastTarget}
                onChange={(e) => setBroadcastTarget(e.target.value)}
                className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-2xl text-xs font-bold text-gray-800 focus:outline-none focus:border-indigo-500"
              >
                <option value="ALL">🌐 সকল মেসে একসাথে পাঠান (Global Broadcast)</option>
                {(superAdminData?.messes || []).map((m: any) => (
                  <option key={m._id} value={m._id}>🏢 {m.name} ({m.code})</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-extrabold text-gray-700 mb-1">নোটিশ শিরোনাম (Title)</label>
              <input
                type="text"
                placeholder="যেমন: নতুন সিস্টেম আপডেট বা জরুরি নোটিশ..."
                value={broadcastTitle}
                onChange={(e) => setBroadcastTitle(e.target.value)}
                className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-2xl text-xs font-bold text-gray-900 focus:outline-none focus:border-indigo-500"
              />
            </div>

            <div>
              <label className="block text-xs font-extrabold text-gray-700 mb-1">নোটিশের বিবরণ (Message Content)</label>
              <textarea
                rows={4}
                placeholder="বিস্তারিত বার্তা লিখুন..."
                value={broadcastMessage}
                onChange={(e) => setBroadcastMessage(e.target.value)}
                className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-2xl text-xs font-semibold text-gray-900 focus:outline-none focus:border-indigo-500"
              />
            </div>

            <button
              type="submit"
              disabled={broadcasting}
              className="py-3 px-6 bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold rounded-2xl text-xs transition-all flex items-center gap-2 shadow-md shadow-indigo-100 disabled:opacity-50"
            >
              {broadcasting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              ব্রডকাস্ট নোটিশ সেন্ড করুন
            </button>
          </form>
        </div>
      )}

      {/* TAB 5: DATABASE STORAGE ANALYTICS */}
      {activeTab === 'database' && (
        <div className="bg-white rounded-3xl p-6 border border-gray-100 shadow-[0_8px_30px_rgb(0,0,0,0.02)] space-y-6">
          <h3 className="font-extrabold text-gray-900 text-base border-b border-gray-100 pb-3 flex items-center gap-2">
            <Database className="w-5 h-5 text-indigo-500" />
            MongoDB সিস্টেম হেলথ ও স্টোরেজ এনালাইটিক্স
          </h3>

          {!dbStats ? (
            <div className="flex justify-center items-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
            </div>
          ) : (
            <div className="space-y-6">
              {/* Storage Space Progress Card */}
              <div className="bg-gradient-to-br from-indigo-950 via-slate-900 to-slate-950 text-white p-6 rounded-3xl border border-slate-800 relative overflow-hidden">
                <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none">
                  <HardDrive className="w-32 h-32 text-white animate-pulse" />
                </div>
                
                <span className="text-xs font-extrabold text-indigo-300 tracking-wider uppercase">মোট স্টোরেজ ব্যবহার (M0 Free Tier 512MB)</span>
                <div className="flex items-baseline gap-2 mt-2 mb-4">
                  <span className="text-3xl font-black">{formatBytes(dbStats.totalUsedBytes)}</span>
                  <span className="text-xs text-gray-400 font-bold">/ {formatBytes(dbStats.totalLimitBytes)}</span>
                </div>

                <div className="space-y-2">
                  <div className="w-full bg-slate-800 rounded-full h-3 overflow-hidden">
                    <div 
                      className={`h-full rounded-full transition-all duration-500 ${
                        Number(dbStats.percentUsed) > 80 ? 'bg-rose-500 animate-pulse' : Number(dbStats.percentUsed) > 50 ? 'bg-amber-500' : 'bg-emerald-500'
                      }`}
                      style={{ width: `${dbStats.percentUsed}%` }}
                    />
                  </div>
                  <div className="flex justify-between text-xs text-gray-400 font-bold">
                    <span>{dbStats.percentUsed}% ব্যবহৃত</span>
                    <span>ফাঁকা জায়গা: {formatBytes(dbStats.freeSpaceBytes)}</span>
                  </div>
                </div>
              </div>

              {/* Detail Stats Grid */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="p-4 bg-gray-50 border border-gray-100 rounded-2xl flex flex-col">
                  <span className="text-[10px] font-extrabold text-gray-400 uppercase tracking-wider">ডাটা সাইজ (Logical)</span>
                  <span className="text-lg font-black text-gray-800 mt-1">{formatBytes(dbStats.dataSizeBytes)}</span>
                </div>
                <div className="p-4 bg-gray-50 border border-gray-100 rounded-2xl flex flex-col">
                  <span className="text-[10px] font-extrabold text-gray-400 uppercase tracking-wider">ইনডেক্স সাইজ</span>
                  <span className="text-lg font-black text-gray-800 mt-1">{formatBytes(dbStats.indexSizeBytes)}</span>
                </div>
                <div className="p-4 bg-gray-50 border border-gray-100 rounded-2xl flex flex-col">
                  <span className="text-[10px] font-extrabold text-gray-400 uppercase tracking-wider">মোট কালেকশন</span>
                  <span className="text-lg font-black text-gray-800 mt-1">{dbStats.collectionsCount} টি</span>
                </div>
                <div className="p-4 bg-gray-50 border border-gray-100 rounded-2xl flex flex-col">
                  <span className="text-[10px] font-extrabold text-gray-400 uppercase tracking-wider">মোট ডাটা অবজেক্টস</span>
                  <span className="text-lg font-black text-gray-800 mt-1">{dbStats.objectsCount} টি</span>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB 6: SIDEBAR TAB VISIBILITY SETTINGS */}
      {activeTab === 'settings' && (
        <div className="bg-white rounded-3xl p-6 border border-gray-100 shadow-[0_8px_30px_rgb(0,0,0,0.02)] space-y-6">
          <div>
            <h3 className="font-extrabold text-gray-900 text-base mb-1 flex items-center gap-2">
              <Layers className="w-5 h-5 text-indigo-500" />
              মেম্বার সাইডবার মেন্যু দৃশ্যমানতা (Tab Visibility)
            </h3>
            <p className="text-xs text-gray-400 font-medium">মেসের সাধারণ মেম্বারদের সাইডবারে কোন কোন ট্যাবগুলো ভিজিবল থাকবে তা কন্ট্রোল করুন।</p>
          </div>

          <div className="space-y-3 max-w-xl">
            {tabList.map((tab) => (
              <div key={tab.key} className="flex items-center justify-between p-4 bg-gray-50 hover:bg-gray-100/60 border border-gray-100 rounded-2xl transition-all">
                <span className="text-gray-800 text-xs font-extrabold capitalize">{tab.label}</span>
                <button 
                  onClick={() => toggleTabSetting(tab.key)}
                  className={`flex items-center transition-all ${settings?.[tab.key] ? 'text-emerald-500' : 'text-gray-400'}`}
                >
                  {settings?.[tab.key] ? (
                    <ToggleRight className="w-9 h-9" />
                  ) : (
                    <ToggleLeft className="w-9 h-9" />
                  )}
                </button>
              </div>
            ))}
          </div>

          <button 
            onClick={saveSettings}
            disabled={saving}
            className="py-3 px-6 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl text-xs font-extrabold transition-all flex items-center gap-2 disabled:opacity-50 shadow-md shadow-indigo-100"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            সেটিংস সেভ করুন
          </button>
        </div>
      )}
    </div>
  );
}
