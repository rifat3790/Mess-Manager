"use client";

import { 
  Wallet, 
  Utensils, 
  ShoppingBag, 
  CreditCard, 
  ArrowUpRight, 
  TrendingDown, 
  FileText, 
  Loader2, 
  AlertCircle, 
  Receipt, 
  Users, 
  Search, 
  Calendar, 
  CheckCircle2, 
  MessageSquare,
  Plus,
  Minus,
  Crown,
  Coins,
  Award,
  Sparkles,
  Filter,
  Check,
  X
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/context/AuthContext';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { 
  getDashboardData, 
  getUserMealStatusForTodayAndTomorrow, 
  updateUserMealForDate,
  createOrUpdateMealRequest,
  getPendingMealRequests,
  approveMealRequest,
  rejectMealRequest
} from './actions/dataActions';
import { getBazaarSchedules } from './actions/bazaarActions';
import { useRouter } from 'next/navigation';
import { toast } from 'react-hot-toast';

export default function Home() {
  const { user, mongoUser, loading: authLoading, messName } = useAuth();
  const router = useRouter();
  
  const [dataLoading, setDataLoading] = useState(true);
  const [globalStats, setGlobalStats] = useState<any>(null);
  const [myStats, setMyStats] = useState<any>(null);
  const [allMembers, setAllMembers] = useState<any[]>([]);
  const [bazaarSchedules, setBazaarSchedules] = useState<any[]>([]);
  
  // Daily Meals state
  const [myMeals, setMyMeals] = useState<{ today: any, tomorrow: any, pendingToday: any, pendingTomorrow: any } | null>(null);
  const [draftMeals, setDraftMeals] = useState<{ today: any, tomorrow: any } | null>(null);
  const [mealLoading, setMealLoading] = useState<Record<string, boolean>>({});

  // Manager Approval panel state
  const [pendingRequests, setPendingRequests] = useState<any[]>([]);
  const [requestActionLoading, setRequestActionLoading] = useState<Record<string, boolean>>({});

  // Table Search and Filter state
  const [searchQuery, setSearchQuery] = useState("");
  const [activeFilter, setActiveFilter] = useState<"All" | "Positive" | "Negative" | "Manager" | "Member">("All");

  const isManagerOrAdmin = mongoUser?.role === 'Super Admin' || mongoUser?.role === 'Manager';

  async function fetchDashboardData() {
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
          setMyStats({ totalMeal: 0, deposit: 0, totalCost: 0, balance: 0 });
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
        setMyStats({ totalMeal: 0, deposit: 0, totalCost: 0, balance: 0 });
        setAllMembers([]);
      }
    }
    setDataLoading(false);
  }

  async function fetchUserMeals() {
    if (mongoUser && mongoUser.role !== 'Pending') {
      const res = await getUserMealStatusForTodayAndTomorrow(mongoUser._id);
      if (res.success) {
        setMyMeals({
          today: res.today,
          tomorrow: res.tomorrow,
          pendingToday: res.pendingToday,
          pendingTomorrow: res.pendingTomorrow
        });
      }
    }
  }

  async function fetchPendingRequests() {
    if (mongoUser && isManagerOrAdmin) {
      const res = await getPendingMealRequests();
      if (res.success) {
        setPendingRequests(res.requests || []);
      }
    }
  }

  useEffect(() => {
    fetchDashboardData();
    fetchUserMeals();
    fetchPendingRequests();
  }, [user, mongoUser]);

  // Initialize draft meals to 0 by default for standard member request input
  useEffect(() => {
    if (myMeals) {
      setDraftMeals({
        today: { breakfast: 0, lunch: 0, dinner: 0 },
        tomorrow: { breakfast: 0, lunch: 0, dinner: 0 }
      });
    }
  }, [myMeals]);

  // Handler for direct edits (Managers/Admins)
  const handleDirectMealChange = async (dateStr: 'today' | 'tomorrow', mealType: 'breakfast' | 'lunch' | 'dinner', change: number) => {
    if (!mongoUser || !myMeals) return;
    
    const currentVal = myMeals[dateStr][mealType] || 0;
    const newVal = Math.max(0, currentVal + change);
    if (newVal === currentVal) return;

    const loadingKey = `${dateStr}-${mealType}`;
    setMealLoading(prev => ({ ...prev, [loadingKey]: true }));

    try {
      const res = await updateUserMealForDate(mongoUser._id, dateStr, mealType, newVal);
      if (res.success) {
        setMyMeals({
          today: res.today,
          tomorrow: res.tomorrow,
          pendingToday: res.pendingToday,
          pendingTomorrow: res.pendingTomorrow
        });
        toast.success("মিল সরাসরি আপডেট করা হয়েছে।");
        fetchDashboardData();
      } else {
        toast.error(res.error || "মিল আপডেট করতে সমস্যা হয়েছে।");
      }
    } catch (err: any) {
      toast.error(err.message || "ত্রুটি ঘটেছে।");
    } finally {
      setMealLoading(prev => ({ ...prev, [loadingKey]: false }));
    }
  };

  // Handler for draft updates (Standard members)
  const handleDraftMealChange = (dateStr: 'today' | 'tomorrow', mealType: 'breakfast' | 'lunch' | 'dinner', change: number) => {
    if (!draftMeals) return;
    const currentVal = draftMeals[dateStr][mealType] || 0;
    const newVal = Math.max(0, currentVal + change);
    setDraftMeals(prev => ({
      ...prev!,
      [dateStr]: {
        ...prev![dateStr],
        [mealType]: newVal
      }
    }));
  };

  // Check if draft has changes (i.e. is any value greater than 0)
  const hasChanges = (dateStr: 'today' | 'tomorrow') => {
    if (!draftMeals) return false;
    const draft = draftMeals[dateStr];
    return draft.breakfast > 0 || draft.lunch > 0 || draft.dinner > 0;
  };

  // Submit Meal Request (Standard members)
  const handleSendMealRequest = async (dateStr: 'today' | 'tomorrow') => {
    if (!mongoUser || !draftMeals) return;
    const draft = draftMeals[dateStr];
    
    const loadingKey = `${dateStr}-request`;
    setMealLoading(prev => ({ ...prev, [loadingKey]: true }));

    try {
      const res = await createOrUpdateMealRequest(mongoUser._id, dateStr, draft.breakfast, draft.lunch, draft.dinner);
      if (res.success) {
        setMyMeals({
          today: res.today,
          tomorrow: res.tomorrow,
          pendingToday: res.pendingToday,
          pendingTomorrow: res.pendingTomorrow
        });
        setDraftMeals(prev => ({
          ...prev!,
          [dateStr]: { breakfast: 0, lunch: 0, dinner: 0 }
        }));
        toast.success("মিলের অনুরোধ সফলভাবে পাঠানো হয়েছে!");
        fetchPendingRequests(); // refresh if we are also admin/manager (though they edit directly)
      } else {
        toast.error(res.error || "অনুরোধ পাঠাতে ব্যর্থ হয়েছে।");
      }
    } catch (err: any) {
      toast.error(err.message || "ত্রুটি ঘটেছে।");
    } finally {
      setMealLoading(prev => ({ ...prev, [loadingKey]: false }));
    }
  };

  // Approve Meal Request (Managers/Admins)
  const handleApproveRequest = async (requestId: string) => {
    if (!mongoUser) return;
    setRequestActionLoading(prev => ({ ...prev, [requestId]: true }));
    try {
      const res = await approveMealRequest(requestId, mongoUser._id);
      if (res.success) {
        toast.success("অনুরোধ অনুমোদন করা হয়েছে!");
        fetchPendingRequests();
        fetchDashboardData();
        fetchUserMeals();
      } else {
        toast.error(res.error || "অনুমোদন ব্যর্থ হয়েছে।");
      }
    } catch (err: any) {
      toast.error(err.message || "ত্রুটি ঘটেছে।");
    } finally {
      setRequestActionLoading(prev => ({ ...prev, [requestId]: false }));
    }
  };

  // Reject Meal Request (Managers/Admins)
  const handleRejectRequest = async (requestId: string) => {
    if (!mongoUser) return;
    setRequestActionLoading(prev => ({ ...prev, [requestId]: true }));
    try {
      const res = await rejectMealRequest(requestId, mongoUser._id);
      if (res.success) {
        toast.success("অনুরোধ প্রত্যাখ্যান করা হয়েছে!");
        fetchPendingRequests();
      } else {
        toast.error(res.error || "প্রত্যাখ্যান ব্যর্থ হয়েছে।");
      }
    } catch (err: any) {
      toast.error(err.message || "ত্রুটি ঘটেছে।");
    } finally {
      setRequestActionLoading(prev => ({ ...prev, [requestId]: false }));
    }
  };
  
  if (authLoading || dataLoading) {
    return (
      <div suppressHydrationWarning className="flex flex-col items-center justify-center min-h-[60vh]">
        <Loader2 className="w-12 h-12 text-indigo-600 animate-spin mb-4" />
        <p className="text-gray-500 font-medium">লোড হচ্ছে...</p>
      </div>
    );
  }

  if (!user || !mongoUser) {
    return (
      <div suppressHydrationWarning className="flex flex-col items-center justify-center min-h-[60vh] bg-white rounded-3xl p-8 border border-gray-100 shadow-[0_8px_30px_rgb(0,0,0,0.04)]">
        <div suppressHydrationWarning className="w-20 h-20 bg-indigo-50 rounded-full flex items-center justify-center mb-6">
          <Wallet className="w-10 h-10 text-indigo-600" />
        </div>
        <h2 className="text-3xl font-bold text-gray-900 mb-2">Mess Manager Premium</h2>
        <p className="text-gray-500 mb-8 max-w-md text-center">আপনার মেসের সব হিসাব নিকাশ এখন আপনার হাতের মুঠোয়। ব্যবহার করতে লগইন করুন।</p>
        <Link href="/login" className="px-8 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-medium transition-colors shadow-md shadow-indigo-200">
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

  // Calculate Leaderboard
  const getLeaderboard = () => {
    if (allMembers.length === 0) return { mealKing: null, depositKing: null, balanceBoss: null, negativeList: [] };

    let mealKing = allMembers[0];
    let depositKing = allMembers[0];
    let balanceBoss = allMembers[0];
    const negativeList = allMembers.filter(m => m.balance < 0);

    allMembers.forEach(m => {
      if (m.totalMeal > mealKing.totalMeal) mealKing = m;
      if (m.deposit > depositKing.deposit) depositKing = m;
      if (m.balance > balanceBoss.balance) balanceBoss = m;
    });

    return {
      mealKing: mealKing.totalMeal > 0 ? mealKing : null,
      depositKing: depositKing.deposit > 0 ? depositKing : null,
      balanceBoss: balanceBoss.balance > 0 ? balanceBoss : null,
      negativeList
    };
  };

  const leaderboard = getLeaderboard();

  // Filter Members
  const filteredMembers = allMembers.filter(member => {
    const matchesSearch = member.name.toLowerCase().includes(searchQuery.toLowerCase());
    
    if (activeFilter === 'All') return matchesSearch;
    if (activeFilter === 'Positive') return matchesSearch && member.balance >= 0;
    if (activeFilter === 'Negative') return matchesSearch && member.balance < 0;
    if (activeFilter === 'Manager') return matchesSearch && (member.role === 'Manager' || member.role === 'Super Admin');
    if (activeFilter === 'Member') return matchesSearch && member.role === 'Member';
    return matchesSearch;
  });

  const hour = new Date().getHours();
  let greeting = 'শুভ সকাল';
  if (hour >= 12 && hour < 17) greeting = 'শুভ অপরাহ্ন';
  else if (hour >= 17 && hour < 20) greeting = 'শুভ সন্ধ্যা';
  else if (hour >= 20 || hour < 5) greeting = 'শুভ রাত্রি';

  return (
    <div suppressHydrationWarning className="w-full space-y-8 pb-16">
      
      {/* Header and Greeting */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 pt-2">
        <div>
          <h2 className="text-3xl font-extrabold text-gray-900 tracking-tight flex items-center gap-2">
            {greeting}, {mongoUser.name.split(' ')[0]}! <span className="text-2xl animate-bounce">👋</span>
          </h2>
          <p className="text-gray-500 font-medium mt-1 text-sm">
            আজকের মেস সামারি ও আপডেটগুলো একনজরে দেখে নিন।
          </p>
        </div>
        
        <div className="flex items-center gap-3 overflow-x-auto pb-2 md:pb-0 scrollbar-none">
           <button onClick={() => router.push('/chat')} className="flex items-center gap-2 px-4 py-2.5 bg-white border border-gray-200 text-gray-700 font-bold rounded-xl shadow-sm hover:border-indigo-400 hover:text-indigo-600 transition-colors whitespace-nowrap">
             <MessageSquare className="w-4 h-4 text-indigo-500" /> মেস চ্যাট
           </button>
           <button onClick={() => router.push('/bazaar')} className="flex items-center gap-2 px-4 py-2.5 bg-white border border-gray-200 text-gray-700 font-bold rounded-xl shadow-sm hover:border-emerald-400 hover:text-emerald-600 transition-colors whitespace-nowrap">
             <Calendar className="w-4 h-4 text-emerald-500" /> বাজার শিডিউল
           </button>
           {isManagerOrAdmin && (
             <button onClick={() => router.push('/report/single')} className="flex items-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl shadow-md transition-colors whitespace-nowrap">
               <FileText className="w-4 h-4" /> লেনদেন ম্যানেজ
             </button>
           )}
        </div>
      </div>

      {/* Global Month Statistics Card - Light Premium Theme */}
      <div suppressHydrationWarning className="relative bg-gradient-to-br from-indigo-50/90 via-white/80 to-blue-50/90 text-gray-900 rounded-[2.5rem] p-6 md:p-8 border border-indigo-100/60 shadow-[0_8px_30px_rgb(99,102,241,0.05)] overflow-hidden">
        {/* Soft decorative blur shapes */}
        <div suppressHydrationWarning className="absolute -top-20 -left-20 w-60 h-60 bg-blue-100/55 rounded-full blur-3xl"></div>
        <div suppressHydrationWarning className="absolute -bottom-20 -right-20 w-60 h-60 bg-indigo-100/55 rounded-full blur-3xl"></div>
        
        <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6 mb-8">
          <div className="flex items-center gap-4">
             <div className="w-14 h-14 bg-indigo-600 text-white rounded-2xl flex items-center justify-center font-black text-2xl shadow-lg shadow-indigo-200">
               {messName?.charAt(0) || 'M'}
             </div>
             <div>
               <h1 className="text-2xl font-black tracking-tight text-gray-900">{messName || 'Mohakhali Mess'}</h1>
               <p className="text-xs text-indigo-600 font-bold bg-indigo-50/80 border border-indigo-100/50 px-2.5 py-0.5 rounded-full mt-1 inline-block">
                 {globalStats.monthName === 'কোনো চলমান মাস নেই' ? 'কোনো চলমান মাস নেই' : `${globalStats.monthName} (চলমান মাস)`}
               </p>
             </div>
          </div>
          <button 
            onClick={() => router.push('/report/single')}
            className="flex items-center gap-2 px-5 py-2.5 bg-white hover:bg-gray-50 text-indigo-600 font-bold rounded-xl border border-gray-200/80 transition-all text-xs shadow-sm"
          >
            <FileText className="w-4 h-4" />
            বিস্তারিত রিপোর্ট
          </button>
        </div>

        <div suppressHydrationWarning className="relative z-10 grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-4">
          <div suppressHydrationWarning className="bg-white/80 backdrop-blur-md p-4 rounded-xl border border-gray-100 shadow-sm">
             <p className="text-xs font-bold text-emerald-600 mb-1 flex items-center gap-1"><Wallet className="w-3.5 h-3.5"/> ব্যালেন্স</p>
             <p className="text-lg font-black text-gray-900">{globalStats.balance.toFixed(1)} ৳</p>
          </div>
          <div suppressHydrationWarning className="bg-white/80 backdrop-blur-md p-4 rounded-xl border border-gray-100 shadow-sm">
             <p className="text-xs font-bold text-blue-600 mb-1 flex items-center gap-1"><ArrowUpRight className="w-3.5 h-3.5"/> মোট জমা</p>
             <p className="text-lg font-black text-gray-900">{globalStats.totalDeposit.toFixed(0)} ৳</p>
          </div>
          <div suppressHydrationWarning className="bg-white/80 backdrop-blur-md p-4 rounded-xl border border-gray-100 shadow-sm">
             <p className="text-xs font-bold text-amber-600 mb-1 flex items-center gap-1"><Utensils className="w-3.5 h-3.5"/> মোট মিল</p>
             <p className="text-lg font-black text-gray-900">{globalStats.totalMeals.toFixed(1)}</p>
          </div>
          <div suppressHydrationWarning className="bg-white/80 backdrop-blur-md p-4 rounded-xl border border-gray-100 shadow-sm">
             <p className="text-xs font-bold text-rose-600 mb-1 flex items-center gap-1"><TrendingDown className="w-3.5 h-3.5"/> মিল খরচ</p>
             <p className="text-lg font-black text-gray-900">{globalStats.mealExpenses.toFixed(0)} ৳</p>
          </div>
          <div suppressHydrationWarning className="bg-white/80 backdrop-blur-md p-4 rounded-xl border border-gray-100 shadow-sm">
             <p className="text-xs font-bold text-indigo-600 mb-1 flex items-center gap-1"><Receipt className="w-3.5 h-3.5"/> মিল রেট</p>
             <p className="text-lg font-black text-gray-900">{globalStats.mealRate.toFixed(2)} ৳</p>
          </div>
          <div suppressHydrationWarning className="bg-white/80 backdrop-blur-md p-4 rounded-xl border border-gray-100 shadow-sm">
             <p className="text-xs font-bold text-purple-600 mb-1 flex items-center gap-1"><ShoppingBag className="w-3.5 h-3.5"/> একক খরচ</p>
             <p className="text-lg font-black text-gray-900">{globalStats.singleExpenses?.toFixed(0) || '0'} ৳</p>
          </div>
          <div suppressHydrationWarning className="bg-white/80 backdrop-blur-md p-4 rounded-xl border border-gray-100 shadow-sm">
             <p className="text-xs font-bold text-teal-600 mb-1 flex items-center gap-1"><Users className="w-3.5 h-3.5"/> যৌথ খরচ</p>
             <p className="text-lg font-black text-gray-900">{globalStats.jointExpenses?.toFixed(0) || '0'} ৳</p>
          </div>
        </div>
      </div>

      {/* Main Grid: My Stats, Quick Meal, Bazaar Schedule */}
      <div suppressHydrationWarning className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* Column 1: My Stats & Quick Meal (Takes 8 columns) */}
        <div suppressHydrationWarning className="lg:col-span-8 space-y-8">
          
          {/* My Stats Widget */}
          <div suppressHydrationWarning>
            <div suppressHydrationWarning className="flex items-center gap-2.5 mb-4">
              <Sparkles className="w-5 h-5 text-indigo-500 animate-pulse" />
              <h2 className="text-2xl font-extrabold text-gray-900">আমার বর্তমান হিসাব</h2>
            </div>
            
            <div suppressHydrationWarning className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              {/* Meals */}
              <div suppressHydrationWarning className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm relative overflow-hidden group hover:shadow-md transition-shadow">
                  <div suppressHydrationWarning className="absolute top-0 right-0 w-16 h-16 bg-blue-50/50 rounded-bl-full -mr-2 -mt-2"></div>
                  <div suppressHydrationWarning className="relative z-10">
                    <div className="w-9 h-9 bg-blue-50 text-blue-500 rounded-xl flex items-center justify-center mb-4">
                      <Utensils className="w-5 h-5" />
                    </div>
                    <p className="text-2xl font-black text-gray-900">{myStats.totalMeal.toFixed(1)}</p>
                    <p className="text-xs font-bold text-gray-400 mt-0.5">মোট মিল</p>
                  </div>
              </div>

              {/* Deposit */}
              <div suppressHydrationWarning className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm relative overflow-hidden group hover:shadow-md transition-shadow">
                  <div suppressHydrationWarning className="absolute top-0 right-0 w-16 h-16 bg-emerald-50/50 rounded-bl-full -mr-2 -mt-2"></div>
                  <div suppressHydrationWarning className="relative z-10">
                    <div className="w-9 h-9 bg-emerald-50 text-emerald-500 rounded-xl flex items-center justify-center mb-4">
                      <Wallet className="w-5 h-5" />
                    </div>
                    <p className="text-2xl font-black text-gray-900">{myStats.deposit.toFixed(0)} ৳</p>
                    <p className="text-xs font-bold text-gray-400 mt-0.5">মোট জমা</p>
                  </div>
              </div>

              {/* Expense */}
              <div suppressHydrationWarning className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm relative overflow-hidden group hover:shadow-md transition-shadow">
                  <div suppressHydrationWarning className="absolute top-0 right-0 w-16 h-16 bg-rose-50/50 rounded-bl-full -mr-2 -mt-2"></div>
                  <div suppressHydrationWarning className="relative z-10">
                    <div className="w-9 h-9 bg-rose-50 text-rose-500 rounded-xl flex items-center justify-center mb-4">
                      <ShoppingBag className="w-5 h-5" />
                    </div>
                    <p className="text-2xl font-black text-gray-900">{myStats.totalCost.toFixed(0)} ৳</p>
                    <p className="text-xs font-bold text-gray-400 mt-0.5">মোট খরচ</p>
                  </div>
              </div>

              {/* Balance */}
              <div suppressHydrationWarning className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm relative overflow-hidden group hover:shadow-md transition-shadow">
                  <div suppressHydrationWarning className="absolute top-0 right-0 w-16 h-16 bg-amber-50/50 rounded-bl-full -mr-2 -mt-2"></div>
                  <div suppressHydrationWarning className="relative z-10">
                    <div className="w-9 h-9 bg-amber-50 text-amber-500 rounded-xl flex items-center justify-center mb-4">
                      <CreditCard className="w-5 h-5" />
                    </div>
                    <p className={cn("text-2xl font-black", myStats.balance >= 0 ? "text-emerald-600" : "text-rose-600")}>
                      {myStats.balance.toFixed(0)} ৳
                    </p>
                    <p className="text-xs font-bold text-gray-400 mt-0.5">ব্যালেন্স</p>
                  </div>
              </div>
            </div>
          </div>

          {/* Quick Meal Planner / Requester */}
          <div suppressHydrationWarning className="bg-white border border-gray-150 shadow-sm rounded-3xl p-6 relative overflow-hidden">
            <div className="flex items-center justify-between mb-4 border-b border-gray-100 pb-3">
              <div>
                <h3 className="font-extrabold text-gray-900 text-lg flex items-center gap-2">
                  <Utensils className="w-5 h-5 text-orange-500" />
                  আজ ও আগামীকালের মিল প্ল্যানার
                </h3>
                <p className="text-xs text-gray-500 mt-0.5">
                  {isManagerOrAdmin ? 'মিল সরাসরি আপডেট করুন' : 'মিলের পরিবর্তন অনুরোধ জানান'}
                </p>
              </div>
              <span className="text-xs bg-orange-50 text-orange-600 px-3 py-1 rounded-full font-bold">
                {isManagerOrAdmin ? 'অ্যাডমিন প্যানেল' : 'রিকোয়েস্ট প্যানেল'}
              </span>
            </div>

            {myMeals && draftMeals ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 mt-4">
                
                {/* Today Column */}
                <div className="bg-gray-50/60 rounded-2xl p-4 border border-gray-100 flex flex-col justify-between">
                  <div>
                    <h4 className="font-bold text-gray-800 text-sm mb-3 flex justify-between items-center">
                      <span>আজকের মিল (Today)</span>
                      <div className="flex items-center gap-1.5">
                        {myMeals.pendingToday && (
                          <span className="text-[10px] bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded font-black animate-pulse">পেন্ডিং</span>
                        )}
                        <span className="text-xs font-black text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-md">
                          মোট: {(isManagerOrAdmin 
                            ? ((myMeals.today.breakfast || 0) + (myMeals.today.lunch || 0) + (myMeals.today.dinner || 0))
                            : ((draftMeals.today.breakfast || 0) + (draftMeals.today.lunch || 0) + (draftMeals.today.dinner || 0))
                          ).toFixed(1)}
                        </span>
                      </div>
                    </h4>

                    <div className="space-y-3">
                      {/* Breakfast */}
                      <div className="flex items-center justify-between bg-white p-3 rounded-xl shadow-sm border border-gray-100">
                        <span className="text-xs font-semibold text-gray-600 flex items-center gap-1.5">🥚 সকালের খাবার</span>
                        <div className="flex items-center gap-3">
                          <button 
                            disabled={mealLoading['today-breakfast'] || mealLoading['today-request']}
                            onClick={() => isManagerOrAdmin 
                              ? handleDirectMealChange('today', 'breakfast', -0.5) 
                              : handleDraftMealChange('today', 'breakfast', -0.5)
                            }
                            className="w-7 h-7 bg-gray-100 hover:bg-gray-200 disabled:opacity-40 rounded-lg flex items-center justify-center font-bold text-gray-600 transition-colors"
                          >
                            <Minus className="w-3.5 h-3.5" />
                          </button>
                          {mealLoading['today-breakfast'] ? (
                            <Loader2 className="w-4 h-4 animate-spin text-indigo-500" />
                          ) : (
                            <span className="text-sm font-black text-gray-900 w-6 text-center">
                              {isManagerOrAdmin ? (myMeals.today.breakfast || 0) : (draftMeals.today.breakfast || 0)}
                            </span>
                          )}
                          <button 
                            disabled={mealLoading['today-breakfast'] || mealLoading['today-request']}
                            onClick={() => isManagerOrAdmin 
                              ? handleDirectMealChange('today', 'breakfast', 0.5) 
                              : handleDraftMealChange('today', 'breakfast', 0.5)
                            }
                            className="w-7 h-7 bg-gray-100 hover:bg-gray-200 disabled:opacity-40 rounded-lg flex items-center justify-center font-bold text-gray-600 transition-colors"
                          >
                            <Plus className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>

                      {/* Lunch */}
                      <div className="flex items-center justify-between bg-white p-3 rounded-xl shadow-sm border border-gray-100">
                        <span className="text-xs font-semibold text-gray-600 flex items-center gap-1.5">🍛 দুপুরের খাবার</span>
                        <div className="flex items-center gap-3">
                          <button 
                            disabled={mealLoading['today-lunch'] || mealLoading['today-request']}
                            onClick={() => isManagerOrAdmin 
                              ? handleDirectMealChange('today', 'lunch', -0.5) 
                              : handleDraftMealChange('today', 'lunch', -0.5)
                            }
                            className="w-7 h-7 bg-gray-100 hover:bg-gray-200 disabled:opacity-40 rounded-lg flex items-center justify-center font-bold text-gray-600 transition-colors"
                          >
                            <Minus className="w-3.5 h-3.5" />
                          </button>
                          {mealLoading['today-lunch'] ? (
                            <Loader2 className="w-4 h-4 animate-spin text-indigo-500" />
                          ) : (
                            <span className="text-sm font-black text-gray-900 w-6 text-center">
                              {isManagerOrAdmin ? (myMeals.today.lunch || 0) : (draftMeals.today.lunch || 0)}
                            </span>
                          )}
                          <button 
                            disabled={mealLoading['today-lunch'] || mealLoading['today-request']}
                            onClick={() => isManagerOrAdmin 
                              ? handleDirectMealChange('today', 'lunch', 0.5) 
                              : handleDraftMealChange('today', 'lunch', 0.5)
                            }
                            className="w-7 h-7 bg-gray-100 hover:bg-gray-200 disabled:opacity-40 rounded-lg flex items-center justify-center font-bold text-gray-600 transition-colors"
                          >
                            <Plus className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>

                      {/* Dinner */}
                      <div className="flex items-center justify-between bg-white p-3 rounded-xl shadow-sm border border-gray-100">
                        <span className="text-xs font-semibold text-gray-600 flex items-center gap-1.5">🍲 রাতের খাবার</span>
                        <div className="flex items-center gap-3">
                          <button 
                            disabled={mealLoading['today-dinner'] || mealLoading['today-request']}
                            onClick={() => isManagerOrAdmin 
                              ? handleDirectMealChange('today', 'dinner', -0.5) 
                              : handleDraftMealChange('today', 'dinner', -0.5)
                            }
                            className="w-7 h-7 bg-gray-100 hover:bg-gray-200 disabled:opacity-40 rounded-lg flex items-center justify-center font-bold text-gray-600 transition-colors"
                          >
                            <Minus className="w-3.5 h-3.5" />
                          </button>
                          {mealLoading['today-dinner'] ? (
                            <Loader2 className="w-4 h-4 animate-spin text-indigo-500" />
                          ) : (
                            <span className="text-sm font-black text-gray-900 w-6 text-center">
                              {isManagerOrAdmin ? (myMeals.today.dinner || 0) : (draftMeals.today.dinner || 0)}
                            </span>
                          )}
                          <button 
                            disabled={mealLoading['today-dinner'] || mealLoading['today-request']}
                            onClick={() => isManagerOrAdmin 
                              ? handleDirectMealChange('today', 'dinner', 0.5) 
                              : handleDraftMealChange('today', 'dinner', 0.5)
                            }
                            className="w-7 h-7 bg-gray-100 hover:bg-gray-200 disabled:opacity-40 rounded-lg flex items-center justify-center font-bold text-gray-600 transition-colors"
                          >
                            <Plus className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                      
                      {/* Show current actual meal count for standard member */}
                      {!isManagerOrAdmin && (
                        <div className="mt-3 text-[11px] font-bold text-gray-500 bg-white p-2.5 rounded-xl border border-gray-100 flex justify-between items-center">
                          <span>বর্তমান মিল:</span>
                          <span className="text-indigo-600 bg-indigo-50/50 px-2 py-0.5 rounded-md">
                            সকাল: {myMeals.today.breakfast}, দুপুর: {myMeals.today.lunch}, রাত: {myMeals.today.dinner}
                          </span>
                        </div>
                      )}
                      {/* Show pending request if exists */}
                      {!isManagerOrAdmin && myMeals.pendingToday && (
                        <div className="mt-2 text-[11px] font-extrabold text-amber-700 bg-amber-50 p-2.5 rounded-xl border border-amber-100/50 flex justify-between items-center animate-pulse">
                          <span>পেন্ডিং অনুরোধ:</span>
                          <span>
                            সকাল: {myMeals.pendingToday.breakfast}, দুপুর: {myMeals.pendingToday.lunch}, রাত: {myMeals.pendingToday.dinner}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Standard member send request button */}
                  {!isManagerOrAdmin && hasChanges('today') && (
                    <button
                      onClick={() => handleSendMealRequest('today')}
                      disabled={mealLoading['today-request']}
                      className="mt-4 w-full py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-all shadow-md shadow-indigo-150 flex items-center justify-center gap-2"
                    >
                      {mealLoading['today-request'] ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <Sparkles className="w-3.5 h-3.5" />
                      )}
                      আজকের মিল পরিবর্তন অনুরোধ পাঠান
                    </button>
                  )}
                </div>

                {/* Tomorrow Column */}
                <div className="bg-gray-50/60 rounded-2xl p-4 border border-gray-100 flex flex-col justify-between">
                  <div>
                    <h4 className="font-bold text-gray-800 text-sm mb-3 flex justify-between items-center">
                      <span>আগামীকালের মিল (Tomorrow)</span>
                      <div className="flex items-center gap-1.5">
                        {myMeals.pendingTomorrow && (
                          <span className="text-[10px] bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded font-black animate-pulse">পেন্ডিং</span>
                        )}
                        <span className="text-xs font-black text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-md">
                          মোট: {(isManagerOrAdmin 
                            ? ((myMeals.tomorrow.breakfast || 0) + (myMeals.tomorrow.lunch || 0) + (myMeals.tomorrow.dinner || 0))
                            : ((draftMeals.tomorrow.breakfast || 0) + (draftMeals.tomorrow.lunch || 0) + (draftMeals.tomorrow.dinner || 0))
                          ).toFixed(1)}
                        </span>
                      </div>
                    </h4>

                    <div className="space-y-3">
                      {/* Breakfast */}
                      <div className="flex items-center justify-between bg-white p-3 rounded-xl shadow-sm border border-gray-100">
                        <span className="text-xs font-semibold text-gray-600 flex items-center gap-1.5">🥚 সকালের খাবার</span>
                        <div className="flex items-center gap-3">
                          <button 
                            disabled={mealLoading['tomorrow-breakfast'] || mealLoading['tomorrow-request']}
                            onClick={() => isManagerOrAdmin 
                              ? handleDirectMealChange('tomorrow', 'breakfast', -0.5) 
                              : handleDraftMealChange('tomorrow', 'breakfast', -0.5)
                            }
                            className="w-7 h-7 bg-gray-100 hover:bg-gray-200 disabled:opacity-40 rounded-lg flex items-center justify-center font-bold text-gray-600 transition-colors"
                          >
                            <Minus className="w-3.5 h-3.5" />
                          </button>
                          {mealLoading['tomorrow-breakfast'] ? (
                            <Loader2 className="w-4 h-4 animate-spin text-indigo-500" />
                          ) : (
                            <span className="text-sm font-black text-gray-900 w-6 text-center">
                              {isManagerOrAdmin ? (myMeals.tomorrow.breakfast || 0) : (draftMeals.tomorrow.breakfast || 0)}
                            </span>
                          )}
                          <button 
                            disabled={mealLoading['tomorrow-breakfast'] || mealLoading['tomorrow-request']}
                            onClick={() => isManagerOrAdmin 
                              ? handleDirectMealChange('tomorrow', 'breakfast', 0.5) 
                              : handleDraftMealChange('tomorrow', 'breakfast', 0.5)
                            }
                            className="w-7 h-7 bg-gray-100 hover:bg-gray-200 disabled:opacity-40 rounded-lg flex items-center justify-center font-bold text-gray-600 transition-colors"
                          >
                            <Plus className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>

                      {/* Lunch */}
                      <div className="flex items-center justify-between bg-white p-3 rounded-xl shadow-sm border border-gray-100">
                        <span className="text-xs font-semibold text-gray-600 flex items-center gap-1.5">🍛 দুপুরের খাবার</span>
                        <div className="flex items-center gap-3">
                          <button 
                            disabled={mealLoading['tomorrow-lunch'] || mealLoading['tomorrow-request']}
                            onClick={() => isManagerOrAdmin 
                              ? handleDirectMealChange('tomorrow', 'lunch', -0.5) 
                              : handleDraftMealChange('tomorrow', 'lunch', -0.5)
                            }
                            className="w-7 h-7 bg-gray-100 hover:bg-gray-200 disabled:opacity-40 rounded-lg flex items-center justify-center font-bold text-gray-600 transition-colors"
                          >
                            <Minus className="w-3.5 h-3.5" />
                          </button>
                          {mealLoading['tomorrow-lunch'] ? (
                            <Loader2 className="w-4 h-4 animate-spin text-indigo-500" />
                          ) : (
                            <span className="text-sm font-black text-gray-900 w-6 text-center">
                              {isManagerOrAdmin ? (myMeals.tomorrow.lunch || 0) : (draftMeals.tomorrow.lunch || 0)}
                            </span>
                          )}
                          <button 
                            disabled={mealLoading['tomorrow-lunch'] || mealLoading['tomorrow-request']}
                            onClick={() => isManagerOrAdmin 
                              ? handleDirectMealChange('tomorrow', 'lunch', 0.5) 
                              : handleDraftMealChange('tomorrow', 'lunch', 0.5)
                            }
                            className="w-7 h-7 bg-gray-100 hover:bg-gray-200 disabled:opacity-40 rounded-lg flex items-center justify-center font-bold text-gray-600 transition-colors"
                          >
                            <Plus className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>

                      {/* Dinner */}
                      <div className="flex items-center justify-between bg-white p-3 rounded-xl shadow-sm border border-gray-100">
                        <span className="text-xs font-semibold text-gray-600 flex items-center gap-1.5">🍲 রাতের খাবার</span>
                        <div className="flex items-center gap-3">
                          <button 
                            disabled={mealLoading['tomorrow-dinner'] || mealLoading['tomorrow-request']}
                            onClick={() => isManagerOrAdmin 
                              ? handleDirectMealChange('tomorrow', 'dinner', -0.5) 
                              : handleDraftMealChange('tomorrow', 'dinner', -0.5)
                            }
                            className="w-7 h-7 bg-gray-100 hover:bg-gray-200 disabled:opacity-40 rounded-lg flex items-center justify-center font-bold text-gray-600 transition-colors"
                          >
                            <Minus className="w-3.5 h-3.5" />
                          </button>
                          {mealLoading['tomorrow-dinner'] ? (
                            <Loader2 className="w-4 h-4 animate-spin text-indigo-500" />
                          ) : (
                            <span className="text-sm font-black text-gray-900 w-6 text-center">
                              {isManagerOrAdmin ? (myMeals.tomorrow.dinner || 0) : (draftMeals.tomorrow.dinner || 0)}
                            </span>
                          )}
                          <button 
                            disabled={mealLoading['tomorrow-dinner'] || mealLoading['tomorrow-request']}
                            onClick={() => isManagerOrAdmin 
                              ? handleDirectMealChange('tomorrow', 'dinner', 0.5) 
                              : handleDraftMealChange('tomorrow', 'dinner', 0.5)
                            }
                            className="w-7 h-7 bg-gray-100 hover:bg-gray-200 disabled:opacity-40 rounded-lg flex items-center justify-center font-bold text-gray-600 transition-colors"
                          >
                            <Plus className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                      
                      {/* Show current actual meal count for standard member */}
                      {!isManagerOrAdmin && (
                        <div className="mt-3 text-[11px] font-bold text-gray-500 bg-white p-2.5 rounded-xl border border-gray-100 flex justify-between items-center">
                          <span>বর্তমান মিল:</span>
                          <span className="text-indigo-600 bg-indigo-50/50 px-2 py-0.5 rounded-md">
                            সকাল: {myMeals.tomorrow.breakfast}, দুপুর: {myMeals.tomorrow.lunch}, রাত: {myMeals.tomorrow.dinner}
                          </span>
                        </div>
                      )}
                      {/* Show pending request if exists */}
                      {!isManagerOrAdmin && myMeals.pendingTomorrow && (
                        <div className="mt-2 text-[11px] font-extrabold text-amber-700 bg-amber-50 p-2.5 rounded-xl border border-amber-100/50 flex justify-between items-center animate-pulse">
                          <span>পেন্ডিং অনুরোধ:</span>
                          <span>
                            সকাল: {myMeals.pendingTomorrow.breakfast}, দুপুর: {myMeals.pendingTomorrow.lunch}, রাত: {myMeals.pendingTomorrow.dinner}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Standard member send request button */}
                  {!isManagerOrAdmin && hasChanges('tomorrow') && (
                    <button
                      onClick={() => handleSendMealRequest('tomorrow')}
                      disabled={mealLoading['tomorrow-request']}
                      className="mt-4 w-full py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-all shadow-md shadow-indigo-150 flex items-center justify-center gap-2"
                    >
                      {mealLoading['tomorrow-request'] ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <Sparkles className="w-3.5 h-3.5" />
                      )}
                      আগামীকালের মিল পরিবর্তন অনুরোধ পাঠান
                    </button>
                  )}
                </div>

              </div>
            ) : (
              <div className="flex justify-center p-6"><Loader2 className="w-6 h-6 animate-spin text-orange-500" /></div>
            )}
          </div>

          {/* Pending Meal Requests Panel (Only visible to Managers/Admins) */}
          {isManagerOrAdmin && pendingRequests.length > 0 && (
            <div suppressHydrationWarning className="bg-white border border-amber-100 shadow-sm rounded-3xl p-6 relative overflow-hidden">
              <div className="flex items-center gap-2 mb-4 border-b border-amber-50 pb-3">
                <Crown className="w-5 h-5 text-amber-500" />
                <h3 className="font-extrabold text-gray-900 text-lg">মেম্বারদের মিল পরিবর্তনের অনুরোধ ({pendingRequests.length})</h3>
              </div>
              
              <div className="space-y-4 max-h-[300px] overflow-y-auto scrollbar-thin">
                {pendingRequests.map((req) => (
                  <div key={req._id} className="bg-amber-50/30 border border-amber-100/50 p-4 rounded-2xl flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-800 flex items-center justify-center font-bold flex-shrink-0">
                        {req.userId?.name?.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <p className="font-bold text-gray-900 text-sm capitalize">{req.userId?.name}</p>
                        <p className="text-[10px] font-bold text-gray-500">
                          তারিখ: {new Date(req.date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })}
                        </p>
                        <div className="flex gap-2 mt-1 text-[10px] font-extrabold text-indigo-700 bg-indigo-50/50 border border-indigo-100/30 px-2 py-0.5 rounded-md w-fit">
                          <span>সকাল: {req.breakfast}</span> | <span>দুপুর: {req.lunch}</span> | <span>রাত: {req.dinner}</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 flex-shrink-0">
                      <button
                        onClick={() => handleRejectRequest(req._id)}
                        disabled={requestActionLoading[req._id]}
                        className="p-1.5 bg-rose-50 hover:bg-rose-100 text-rose-600 rounded-xl border border-rose-100 transition-colors"
                        title="প্রত্যাখ্যান করুন"
                      >
                        {requestActionLoading[req._id] ? <Loader2 className="w-4 h-4 animate-spin" /> : <X className="w-4 h-4" />}
                      </button>
                      <button
                        onClick={() => handleApproveRequest(req._id)}
                        disabled={requestActionLoading[req._id]}
                        className="p-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-600 rounded-xl border border-emerald-100 transition-colors"
                        title="অনুমোদন করুন"
                      >
                        {requestActionLoading[req._id] ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Column 2: Bazaar Date & Achievements (Takes 4 columns) */}
        <div suppressHydrationWarning className="lg:col-span-4 space-y-8 flex flex-col">
          
          {/* Bazaar Date Card */}
          <div suppressHydrationWarning className="bg-white rounded-3xl p-6 shadow-sm border border-gray-150 flex flex-col relative overflow-hidden">
             <div suppressHydrationWarning className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none">
                <Calendar className="w-24 h-24 text-indigo-600" />
             </div>

             <div suppressHydrationWarning className="relative z-10 flex-1 flex flex-col">
               <h3 className="font-extrabold text-gray-950 text-base mb-4 flex items-center gap-2">
                 <Calendar className="w-5 h-5 text-indigo-500" />
                 আমার বাজার শিডিউল
               </h3>
               {(() => {
                 const mySchedule = bazaarSchedules.find(s => s.userId._id === mongoUser._id && s.status === 'Approved');
                 const myPending = bazaarSchedules.find(s => s.userId._id === mongoUser._id && s.status === 'Pending');
                 const myCompleted = bazaarSchedules.find(s => s.userId._id === mongoUser._id && s.status === 'Completed');
                 
                 if (myCompleted) {
                   return (
                     <div className="mb-4">
                       <span className="text-xs font-semibold text-gray-400 block mb-1.5">বাজার স্ট্যাটাস</span>
                       <div className="bg-emerald-50 border border-emerald-200 text-emerald-700 font-bold px-4 py-3.5 rounded-xl text-sm flex items-center gap-2">
                         <CheckCircle2 className="w-4 h-4" /> 
                         এই মাসের বাজার সম্পন্ন হয়েছে!
                       </div>
                     </div>
                   );
                 } else if (mySchedule) {
                   return (
                     <div className="mb-4">
                       <span className="text-xs font-semibold text-gray-400 block mb-1.5">আপনার বাজার তারিখ</span>
                       <div className="bg-gradient-to-r from-indigo-50 to-blue-50 border border-indigo-100 text-indigo-900 font-bold px-4 py-3.5 rounded-xl text-sm">
                         {new Date(mySchedule.fromDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })} 
                         {' - '} 
                         {new Date(mySchedule.toDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })}
                       </div>
                     </div>
                   );
                 } else if (myPending) {
                   return (
                     <div className="mb-4">
                       <span className="text-xs font-semibold text-amber-600 block mb-1.5">রিকোয়েস্ট পেন্ডিং</span>
                       <div className="bg-amber-50 border border-amber-200 text-amber-800 font-bold px-4 py-3.5 rounded-xl text-sm">
                         {new Date(myPending.fromDate).toLocaleDateString('en-GB')} - {new Date(myPending.toDate).toLocaleDateString('en-GB')}
                       </div>
                     </div>
                   );
                 } else {
                   return (
                     <div className="mb-4 text-sm text-gray-500 font-medium bg-gray-50 p-4 rounded-xl border border-gray-100">
                       কোনো বাজারের ডেট সেট করা নেই
                     </div>
                   );
                 }
               })()}
               
               <div className="mt-4 pt-4 border-t border-gray-100">
                 {isManagerOrAdmin ? (
                   <button 
                     onClick={() => router.push('/bazaar')}
                     className="w-full py-3 bg-gray-900 hover:bg-gray-800 text-white rounded-xl font-bold transition-colors flex items-center justify-center gap-2 text-sm shadow-md"
                   >
                     <Calendar className="w-4 h-4" />
                     শিডিউল ম্যানেজ করুন
                   </button>
                 ) : (
                   <button 
                     onClick={() => router.push('/bazaar/request')}
                     className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold transition-colors flex items-center justify-center gap-2 text-sm shadow-md"
                   >
                     <Calendar className="w-4 h-4" />
                     নতুন ডেট রিকোয়েস্ট করুন
                   </button>
                 )}
               </div>
             </div>
          </div>

          {/* Leaderboard Achievements Widget */}
          <div suppressHydrationWarning className="bg-white rounded-3xl p-6 shadow-sm border border-gray-150 flex flex-col relative overflow-hidden">
            <h3 className="font-extrabold text-gray-955 text-base mb-4 flex items-center gap-2">
              <Crown className="w-5 h-5 text-amber-500" />
              মেস অ্যাচিভমেন্টস (চলমান মাস)
            </h3>
            
            <div className="space-y-4 text-xs font-semibold">
              {/* Meal King */}
              <div className="flex items-center gap-3 bg-amber-50/50 p-3 rounded-2xl border border-amber-100/50">
                <div className="w-8 h-8 rounded-lg bg-amber-100 flex items-center justify-center text-amber-600 flex-shrink-0">
                  <Crown className="w-4 h-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-gray-400 text-[10px] font-bold uppercase tracking-wider">মিলের রাজা (Meal King)</p>
                  <p className="text-gray-900 font-bold truncate">
                    {leaderboard.mealKing ? `${leaderboard.mealKing.name} (${leaderboard.mealKing.totalMeal.toFixed(1)} মিল)` : 'কেউ না'}
                  </p>
                </div>
              </div>

              {/* Deposit King */}
              <div className="flex items-center gap-3 bg-emerald-50/50 p-3 rounded-2xl border border-emerald-100/50">
                <div className="w-8 h-8 rounded-lg bg-emerald-100 flex items-center justify-center text-emerald-600 flex-shrink-0">
                  <Coins className="w-4 h-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-gray-400 text-[10px] font-bold uppercase tracking-wider">টাকার কুমির (Deposit King)</p>
                  <p className="text-gray-900 font-bold truncate">
                    {leaderboard.depositKing ? `${leaderboard.depositKing.name} (${leaderboard.depositKing.deposit.toFixed(0)} ৳)` : 'কেউ না'}
                  </p>
                </div>
              </div>

              {/* Balance Boss */}
              <div className="flex items-center gap-3 bg-blue-50/50 p-3 rounded-2xl border border-blue-100/50">
                <div className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center text-blue-600 flex-shrink-0">
                  <Award className="w-4 h-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-gray-400 text-[10px] font-bold uppercase tracking-wider">ব্যালেন্স বস (Balance Boss)</p>
                  <p className="text-gray-900 font-bold truncate">
                    {leaderboard.balanceBoss ? `${leaderboard.balanceBoss.name} (+${leaderboard.balanceBoss.balance.toFixed(0)} ৳)` : 'কেউ না'}
                  </p>
                </div>
              </div>

              {/* Negative List warning */}
              <div className="flex items-center gap-3 bg-rose-50/50 p-3 rounded-2xl border border-rose-100/50">
                <div className="w-8 h-8 rounded-lg bg-rose-100 flex items-center justify-center text-rose-600 flex-shrink-0">
                  <AlertCircle className="w-4 h-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-gray-400 text-[10px] font-bold uppercase tracking-wider">লাল তালিকায় যারা (ঋণগ্রস্ত)</p>
                  <p className="text-gray-900 font-bold truncate">
                    {leaderboard.negativeList.length > 0 
                      ? leaderboard.negativeList.map(m => m.name.split(' ')[0]).join(', ') 
                      : 'সবাই প্লাস ব্যালেন্সে!'}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

      </div>

      {/* Bottom Section: All Members Table with Search/Filters */}
      <div suppressHydrationWarning className="mt-8 space-y-6">
         <div suppressHydrationWarning className="flex flex-col md:flex-row md:items-center justify-between gap-4">
           <div>
             <h2 className="text-2xl font-extrabold text-gray-900 tracking-tight">মেম্বারদের লাইভ অবস্থা</h2>
             <p className="text-gray-500 mt-0.5 font-medium text-xs">চলমান মাসের সকল মেম্বারের রিয়েল-টাইম ব্যালেন্স ও হিসাব</p>
           </div>
         </div>
         
         {/* Search & Filters toolbar */}
         <div className="flex flex-col sm:flex-row gap-4 items-center justify-between bg-white p-4 rounded-2xl border border-gray-150 shadow-sm">
           {/* Search Input */}
           <div className="relative w-full sm:w-72">
             <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
             <input
               type="text"
               placeholder="মেম্বারের নাম দিয়ে খুঁজুন..."
               value={searchQuery}
               onChange={(e) => setSearchQuery(e.target.value)}
               className="w-full pl-10 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 font-medium"
             />
           </div>

           {/* Filter Badges */}
           <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto pb-1 sm:pb-0 scrollbar-none">
             <span className="text-gray-400 text-[11px] font-bold flex items-center gap-1 mr-1.5"><Filter className="w-3.5 h-3.5"/> ফিল্টার:</span>
             {(['All', 'Positive', 'Negative', 'Manager', 'Member'] as const).map(filter => (
               <button
                 key={filter}
                 onClick={() => setActiveFilter(filter)}
                 className={cn(
                   "px-3 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap",
                   activeFilter === filter 
                     ? "bg-indigo-600 text-white shadow-sm" 
                     : "bg-gray-50 hover:bg-gray-100 text-gray-600"
                 )}
               >
                 {filter === 'All' && 'সবাই'}
                 {filter === 'Positive' && 'প্লাস ব্যালেন্স'}
                 {filter === 'Negative' && 'মাইনাস ব্যালেন্স'}
                 {filter === 'Manager' && 'ম্যানেজার'}
                 {filter === 'Member' && 'মেম্বার'}
               </button>
             ))}
           </div>
         </div>
         
         <div suppressHydrationWarning className="bg-white rounded-3xl shadow-sm border border-gray-150 overflow-hidden">
           <div suppressHydrationWarning className="overflow-x-auto">
             <table className="w-full text-left border-collapse">
               <thead>
                 <tr className="bg-gray-50/50 border-b border-gray-100">
                   <th className="px-6 py-4.5 text-xs font-bold text-gray-400 uppercase tracking-wider">মেম্বার</th>
                   <th className="px-6 py-4.5 text-xs font-bold text-gray-400 uppercase tracking-wider text-center">মোট মিল</th>
                   <th className="px-6 py-4.5 text-xs font-bold text-gray-400 uppercase tracking-wider text-center">জমা</th>
                   <th className="px-6 py-4.5 text-xs font-bold text-gray-400 uppercase tracking-wider text-center">মোট খরচ</th>
                   <th className="px-6 py-4.5 text-xs font-bold text-gray-400 uppercase tracking-wider text-right">ব্যালেন্স</th>
                 </tr>
               </thead>
               <tbody className="divide-y divide-gray-50">
                 {filteredMembers.length === 0 ? (
                   <tr>
                     <td colSpan={5} className="px-6 py-12 text-center text-gray-400 font-bold">কোনো মেম্বারের ডেটা পাওয়া যায়নি।</td>
                   </tr>
                 ) : (
                   filteredMembers.map((member, idx) => (
                     <tr key={member._id} className="hover:bg-indigo-50/20 transition-colors group">
                       <td className="px-6 py-4">
                         <div suppressHydrationWarning className="flex items-center gap-3.5">
                           <div suppressHydrationWarning className={cn(
                             "w-10 h-10 rounded-xl flex items-center justify-center text-white font-bold text-base shadow-sm",
                             idx % 4 === 0 ? 'bg-blue-500' : idx % 4 === 1 ? 'bg-emerald-500' : idx % 4 === 2 ? 'bg-indigo-500' : 'bg-rose-500'
                           )}>
                             {member.name.charAt(0).toUpperCase()}
                           </div>
                           <div suppressHydrationWarning>
                             <p className="font-bold text-gray-900 capitalize text-sm">{member.name}</p>
                             <p className="text-[10px] font-bold text-gray-400 uppercase mt-0.5">
                               {member.role === 'Super Admin' ? 'Super Admin' : member.role === 'Manager' ? 'Manager' : 'Member'}
                             </p>
                           </div>
                         </div>
                       </td>
                       <td className="px-6 py-4 text-center">
                         <span className="font-bold text-gray-700 bg-gray-50 border border-gray-100 px-3 py-1 rounded-lg text-sm">
                           {member.totalMeal.toFixed(1)}
                         </span>
                       </td>
                       <td className="px-6 py-4 text-center font-bold text-emerald-600 text-sm">
                         {member.deposit.toFixed(0)} ৳
                       </td>
                       <td className="px-6 py-4 text-center font-bold text-rose-500 text-sm">
                         {member.totalCost.toFixed(0)} ৳
                       </td>
                       <td className="px-6 py-4 text-right">
                         <span className={cn(
                           "px-3.5 py-1.5 rounded-lg text-xs font-black tracking-wide",
                           member.balance >= 0 ? "bg-emerald-50 text-emerald-600 border border-emerald-100" : "bg-rose-50 text-rose-600 border border-rose-100"
                         )}>
                           {member.balance > 0 ? '+' : ''}{member.balance.toFixed(0)} ৳
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
