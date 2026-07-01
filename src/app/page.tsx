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
  X,
  Bell,
  ChefHat,
  Bookmark,
  ChevronRight,
  Calculator,
  Activity,
  Phone,
  Copy,
  Info,
  TrendingUp,
  Trash2,
  Edit2
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/context/AuthContext';
import Link from 'next/link';
import { useEffect, useState, useMemo } from 'react';
import { 
  getDashboardData, 
  getUserMealStatusForTodayAndTomorrow, 
  updateUserMealForDate,
  createOrUpdateMealRequest,
  getPendingMealRequests,
  approveMealRequest,
  rejectMealRequest,
  getTodayMenu,
  updateTodayMenu,
  getLatestNotices,
  createNotice,
  checkAndNotifyLowBalance,
  submitMenuRating,
  getMenuRatings
} from './actions/dataActions';
import { getBazaarSchedules } from './actions/bazaarActions';
import { getNotifications } from './actions/notificationActions';
import { getContacts, saveContact, deleteContact } from './actions/adminActions';
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

  // Today's Menu state
  const [menu, setMenu] = useState<any>(null);
  const [isEditingMenu, setIsEditingMenu] = useState(false);
  const [menuBreakfast, setMenuBreakfast] = useState('');
  const [menuLunch, setMenuLunch] = useState('');
  const [menuDinner, setMenuDinner] = useState('');
  const [menuSubmitLoading, setMenuSubmitLoading] = useState(false);

  // Notice Board state
  const [notices, setNotices] = useState<any[]>([]);
  const [isAddingNotice, setIsAddingNotice] = useState(false);
  const [noticeTitle, setNoticeTitle] = useState('');
  const [noticeContent, setNoticeContent] = useState('');
  const [noticeSubmitLoading, setNoticeSubmitLoading] = useState(false);
  const [estDailyMeals, setEstDailyMeals] = useState<number>(2);
  const [customMealRate, setCustomMealRate] = useState<string>('');
  const [showBalanceModal, setShowBalanceModal] = useState(false);
  const [breakfastRating, setBreakfastRating] = useState<number>(0);
  const [lunchRating, setLunchRating] = useState<number>(0);
  const [dinnerRating, setDinnerRating] = useState<number>(0);
  const [menuAverages, setMenuAverages] = useState<{ breakfast: number; lunch: number; dinner: number; totalCount: number }>({ breakfast: 0, lunch: 0, dinner: 0, totalCount: 0 });
  const [allMenuRatings, setAllMenuRatings] = useState<any[]>([]);
  const [showRatingsDetailModal, setShowRatingsDetailModal] = useState<boolean>(false);

  // Future Balance Projector
  const [estMeals, setEstMeals] = useState<string>('');
  const [estSingleExp, setEstSingleExp] = useState<string>('');
  
  // Live Notifications Feed
  const [notifications, setNotifications] = useState<any[]>([]);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [popupNotification, setPopupNotification] = useState<any | null>(null);

  // Emergency Contacts state
  const [contacts, setContacts] = useState<any[]>([]);
  const [isEditingContact, setIsEditingContact] = useState<boolean>(false);
  const [selectedContact, setSelectedContact] = useState<any | null>(null);
  const [contactDesignation, setContactDesignation] = useState('');
  const [contactName, setContactName] = useState('');
  const [contactPhone, setContactPhone] = useState('');
  const [contactSubmitLoading, setContactSubmitLoading] = useState(false);

  const formatSafeDate = (dateVal: any, formatOpts: Intl.DateTimeFormatOptions = { day: '2-digit', month: 'short' }) => {
    if (!dateVal) return 'অজানা তারিখ';
    try {
      const d = new Date(dateVal);
      if (isNaN(d.getTime())) return 'অজানা তারিখ';
      return d.toLocaleDateString('en-GB', formatOpts);
    } catch {
      return 'অজানা তারিখ';
    }
  };

  // Find a notice posted in the last 3 days (Memoized at top-level)
  const recentNotice = useMemo(() => {
    if (!notices || notices.length === 0) return null;
    const threeDaysAgo = new Date();
    threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);
    return notices.find(n => new Date(n.createdAt) >= threeDaysAgo);
  }, [notices]);

  // Budget spent health calculator (Memoized at top-level)
  const budgetHealth = useMemo(() => {
    const totalDeposit = globalStats?.totalDeposit || 0;
    const totalExpense = globalStats?.totalExpense || 0;
    const spentPercentage = totalDeposit > 0 ? (totalExpense / totalDeposit) * 100 : 0;
    let healthStatus = "চমৎকার (Safe)";
    let healthColor = "text-emerald-600 bg-emerald-50 border-emerald-100";
    let progressColor = "bg-emerald-500";
    if (spentPercentage > 70 && spentPercentage <= 90) {
      healthStatus = "সতর্কতা (Warning)";
      healthColor = "text-amber-600 bg-amber-50 border-amber-100";
      progressColor = "bg-amber-500";
    } else if (spentPercentage > 90) {
      healthStatus = "বাজেট শেষ (Alert)";
      healthColor = "text-rose-600 bg-rose-50 border-rose-100";
      progressColor = "bg-rose-500";
    }
    return { spentPercentage, healthStatus, healthColor, progressColor };
  }, [globalStats?.totalDeposit, globalStats?.totalExpense]);

  const { spentPercentage, healthStatus, healthColor, progressColor } = budgetHealth;

  const isManagerOrAdmin = mongoUser?.role === 'Super Admin' || mongoUser?.role === 'Manager';

  async function fetchDashboardData() {
    if (!user || !mongoUser || mongoUser.role === 'Pending') {
      setDataLoading(false);
      return;
    }
    
    try {
      const [res, scheduleRes, notificationRes, contactsRes] = await Promise.all([
        getDashboardData(),
        getBazaarSchedules(),
        getNotifications(mongoUser._id),
        getContacts()
      ]);

      if (scheduleRes.success) {
        setBazaarSchedules(scheduleRes.schedules || []);
      }

      if (notificationRes.success) {
        setNotifications(notificationRes.notifications || []);
      }

      if (contactsRes.success) {
        setContacts(contactsRes.contacts || []);
      }

      if (res.success) {
        if (res.stats) {
          setGlobalStats(res.stats);
          setCustomMealRate(res.stats.mealRate ? res.stats.mealRate.toFixed(2) : '40.00');
          setAllMembers(res.members || []);
          const me = res.members.find((m: any) => m._id === mongoUser._id);
          if (me) {
            setMyStats(me);
            if (me.balance <= 0) {
              checkAndNotifyLowBalance(mongoUser._id, me.balance);
              const dismissed = sessionStorage.getItem('balanceWarningDismissed');
              if (dismissed !== 'true') {
                setShowBalanceModal(true);
              }
            }
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
    } catch (err: any) {
      console.error("Error fetching dashboard data:", err);
    } finally {
      setDataLoading(false);
    }
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

  async function fetchMenuAndNotices() {
    if (mongoUser && mongoUser.role !== 'Pending') {
      const [menuRes, noticesRes, ratingsRes] = await Promise.all([
        getTodayMenu(),
        getLatestNotices(),
        getMenuRatings(new Date(), mongoUser._id)
      ]);
      if (menuRes.success && menuRes.menu) {
        setMenu(menuRes.menu);
        setMenuBreakfast(menuRes.menu.breakfast || '');
        setMenuLunch(menuRes.menu.lunch || '');
        setMenuDinner(menuRes.menu.dinner || '');
      }
      if (noticesRes.success) {
        setNotices(noticesRes.notices || []);
      }
      if (ratingsRes.success) {
        setMenuAverages(ratingsRes.averages || { breakfast: 0, lunch: 0, dinner: 0, totalCount: 0 });
        setAllMenuRatings(ratingsRes.allRatings || []);
        if (ratingsRes.userRating) {
          setBreakfastRating(ratingsRes.userRating.breakfast || 0);
          setLunchRating(ratingsRes.userRating.lunch || 0);
          setDinnerRating(ratingsRes.userRating.dinner || 0);
        }
      }
    }
  }

  useEffect(() => {
    fetchDashboardData();
    fetchUserMeals();
    fetchPendingRequests();
    fetchMenuAndNotices();
  }, [user, mongoUser]);

  // Polling for live notifications (AJAX style real-time updates)
  useEffect(() => {
    if (!mongoUser || mongoUser.role === 'Pending') return;

    // Helper to fetch notifications and check for new ones
    const pollNotifications = async (isInitial = false) => {
      try {
        const res = await getNotifications(mongoUser._id);
        if (res.success && res.notifications) {
          const fetchedList = res.notifications;
          setNotifications(fetchedList);

          // Get seen IDs from localStorage
          const seenIdsStr = localStorage.getItem('seenNotifications');
          const seenIds: string[] = seenIdsStr ? JSON.parse(seenIdsStr) : [];

          if (isInitial) {
            // Mark all existing notifications as seen on initial load
            const allIds = fetchedList.map((n: any) => n._id);
            localStorage.setItem('seenNotifications', JSON.stringify(allIds));
          } else {
            // Find new notifications
            const newNotifs = fetchedList.filter((n: any) => !seenIds.includes(n._id));
            if (newNotifs.length > 0) {
              // Trigger vibration
              if (typeof window !== 'undefined' && window.navigator && window.navigator.vibrate) {
                window.navigator.vibrate([200, 100, 200]);
              }
              // Show popup for the latest new notification
              setPopupNotification(newNotifs[0]);

              // Update seen IDs in localStorage
              const updatedSeenIds = [...seenIds, ...newNotifs.map((n: any) => n._id)];
              localStorage.setItem('seenNotifications', JSON.stringify(updatedSeenIds));
            }
          }
        }
      } catch (err) {
        console.error("Polling notifications error:", err);
      }
    };

    // Initial load already handled in fetchDashboardData, but we setup polling
    const interval = setInterval(() => {
      pollNotifications(false);
    }, 10000); // Poll every 10 seconds

    return () => clearInterval(interval);
  }, [mongoUser]);

  // Initialize draft meals to 0 by default for standard member request input
  useEffect(() => {
    if (myMeals) {
      setDraftMeals({
        today: { breakfast: 0, lunch: 0, dinner: 0 },
        tomorrow: { breakfast: 0, lunch: 0, dinner: 0 }
      });
    }
  }, [myMeals]);

  const handleRateMenu = async (type: 'breakfast' | 'lunch' | 'dinner', rating: number) => {
    if (!mongoUser) return;
    try {
      const res = await submitMenuRating(mongoUser._id, new Date(), type, rating);
      if (res.success) {
        if (type === 'breakfast') setBreakfastRating(rating);
        if (type === 'lunch') setLunchRating(rating);
        if (type === 'dinner') setDinnerRating(rating);
        
        toast.success('খাবারের রেটিং সফলভাবে দেওয়া হয়েছে!');
        fetchMenuAndNotices();
      } else {
        toast.error(res.error || 'রেটিং দিতে সমস্যা হয়েছে।');
      }
    } catch (err: any) {
      toast.error(err.message || 'ভুল হয়েছে।');
    }
  };

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
        fetchPendingRequests();
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

  // Handle Cooking Menu Save
  const handleMenuSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!mongoUser) return;
    setMenuSubmitLoading(true);
    try {
      const res = await updateTodayMenu(menuBreakfast, menuLunch, menuDinner, mongoUser._id);
      if (res.success) {
        toast.success("মেনু সফলভাবে আপডেট হয়েছে!");
        setIsEditingMenu(false);
        fetchMenuAndNotices();
      } else {
        toast.error(res.error || "মেনু আপডেট করতে সমস্যা হয়েছে।");
      }
    } catch (err: any) {
      toast.error(err.message || "ভুল হয়েছে।");
    } finally {
      setMenuSubmitLoading(false);
    }
  };

  // Handle Notice Post
  const handleNoticeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!noticeTitle || !noticeContent || !mongoUser) return;
    setNoticeSubmitLoading(true);
    try {
      const res = await createNotice(noticeTitle, noticeContent, mongoUser._id);
      if (res.success) {
        toast.success("নোটিশ সফলভাবে দেওয়া হয়েছে!");
        setNoticeTitle('');
        setNoticeContent('');
        setIsAddingNotice(false);
        fetchMenuAndNotices();
      } else {
        toast.error(res.error || "নোটিশ পোস্ট করতে সমস্যা হয়েছে।");
      }
    } catch (err: any) {
      toast.error(err.message || "ভুল হয়েছে।");
    } finally {
      setNoticeSubmitLoading(false);
    }
  };

  // Handle Contact Add/Edit
  const handleEditContactClick = (contact: any) => {
    setSelectedContact(contact);
    setContactDesignation(contact.designation);
    setContactName(contact.name);
    setContactPhone(contact.phone);
    setIsEditingContact(true);
  };

  const handleContactSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!contactDesignation || !contactName || !contactPhone || !mongoUser) return;
    setContactSubmitLoading(true);
    try {
      const res = await saveContact(mongoUser._id, {
        _id: selectedContact?._id,
        designation: contactDesignation,
        name: contactName,
        phone: contactPhone
      });
      if (res.success) {
        toast.success(selectedContact ? "কন্টাক্ট সফলভাবে এডিট হয়েছে!" : "কন্টাক্ট সফলভাবে যোগ হয়েছে!");
        setIsEditingContact(false);
        setSelectedContact(null);
        setContactDesignation('');
        setContactName('');
        setContactPhone('');
        fetchDashboardData();
      } else {
        toast.error(res.error || "সংরক্ষণ করতে সমস্যা হয়েছে।");
      }
    } catch (err: any) {
      toast.error(err.message || "ভুল হয়েছে।");
    } finally {
      setContactSubmitLoading(false);
    }
  };

  const handleDeleteContactClick = async (contactId: string) => {
    if (!mongoUser || !window.confirm("আপনি কি নিশ্চিতভাবে কন্টাক্টটি ডিলিট করতে চান?")) return;
    try {
      const res = await deleteContact(mongoUser._id, contactId);
      if (res.success) {
        toast.success("কন্টাক্ট সফলভাবে ডিলিট হয়েছে!");
        fetchDashboardData();
      } else {
        toast.error(res.error || "ডিলিট করতে সমস্যা হয়েছে।");
      }
    } catch (err: any) {
      toast.error(err.message || "ভুল হয়েছে।");
    }
  };
  
  if (authLoading) {
    return (
      <div suppressHydrationWarning className="flex flex-col items-center justify-center min-h-[60vh]">
        <Loader2 className="w-12 h-12 text-indigo-600 animate-spin mb-4" />
        <p className="text-gray-500 font-medium">লোড হচ্ছে...</p>
      </div>
    );
  }

  if (dataLoading) {
    return (
      <div suppressHydrationWarning className="w-full space-y-8 pb-16 animate-pulse">
        {/* Header Skeleton */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 pt-2">
          <div className="space-y-2.5">
            <div className="h-8 bg-gray-200 rounded-2xl w-48"></div>
            <div className="h-4 bg-gray-150 rounded-xl w-64"></div>
          </div>
          <div className="flex gap-3 overflow-x-auto pb-2 md:pb-0">
            <div className="h-11 bg-gray-200 rounded-xl w-28 flex-shrink-0"></div>
            <div className="h-11 bg-gray-200 rounded-xl w-32 flex-shrink-0"></div>
          </div>
        </div>

        {/* Global Month Statistics Card Skeleton */}
        <div className="bg-gray-100/40 rounded-[2.5rem] p-6 md:p-8 space-y-8 border border-gray-150">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 bg-gray-200 rounded-2xl"></div>
            <div className="space-y-2">
              <div className="h-6 bg-gray-200 rounded-lg w-40"></div>
              <div className="h-4 bg-gray-150 rounded-md w-28"></div>
            </div>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-4">
            {[...Array(7)].map((_, i) => (
              <div key={i} className="bg-white p-4 rounded-xl space-y-2 border border-gray-100">
                <div className="h-3 bg-gray-200 rounded w-14"></div>
                <div className="h-5 bg-gray-250 rounded w-16"></div>
              </div>
            ))}
          </div>
        </div>

        {/* Grid layout skeleton */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          <div className="lg:col-span-8 space-y-8">
            <div className="bg-white border border-gray-100 rounded-3xl p-6 h-64 flex flex-col justify-between">
              <div className="h-6 bg-gray-200 rounded-lg w-36"></div>
              <div className="space-y-3">
                <div className="h-12 bg-gray-100 rounded-2xl w-full"></div>
                <div className="h-12 bg-gray-100 rounded-2xl w-full"></div>
              </div>
            </div>
            <div className="bg-white border border-gray-100 rounded-3xl p-6 h-48 flex flex-col justify-between">
              <div className="h-6 bg-gray-200 rounded-lg w-40"></div>
              <div className="h-12 bg-gray-150 rounded-2xl w-full"></div>
            </div>
          </div>
          <div className="lg:col-span-4 space-y-8">
            <div className="bg-white border border-gray-100 rounded-3xl p-6 h-40 flex flex-col justify-between">
              <div className="h-6 bg-gray-200 rounded-lg w-32"></div>
              <div className="h-12 bg-gray-150 rounded-2xl w-full"></div>
            </div>
            <div className="bg-white border border-gray-100 rounded-3xl p-6 h-48 flex flex-col justify-between">
              <div className="h-6 bg-gray-200 rounded-lg w-48"></div>
              <div className="h-12 bg-gray-150 rounded-2xl w-full"></div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!user || !mongoUser) {
    return (
      <div suppressHydrationWarning className="flex flex-col items-center justify-center min-h-[60vh] bg-white rounded-3xl p-8 shadow-[0_8px_30px_rgb(0,0,0,0.03)]">
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
      <div suppressHydrationWarning className="flex flex-col items-center justify-center min-h-[60vh] bg-white rounded-3xl p-8 shadow-[0_8px_30px_rgb(0,0,0,0.03)]">
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
            {greeting}, {mongoUser?.name ? mongoUser.name.split(' ')[0] : 'ইউজার'}! <span className="text-2xl animate-bounce">👋</span>
          </h2>
          <p className="text-gray-500 font-medium mt-1 text-sm">
            আজকের মেস সামারি ও আপডেটগুলো একনজরে দেখে নিন।
          </p>
        </div>
        
        <div className="flex items-center gap-3 overflow-x-auto pb-2 md:pb-0 scrollbar-none">
           <button onClick={() => router.push('/chat')} className="flex items-center gap-2 px-4 py-2.5 bg-white text-gray-700 font-bold rounded-xl shadow-[0_8px_30px_rgb(0,0,0,0.03)] hover:text-indigo-600 transition-colors whitespace-nowrap">
             <MessageSquare className="w-4 h-4 text-indigo-500" /> মেস চ্যাট
           </button>
           <button onClick={() => router.push('/bazaar')} className="flex items-center gap-2 px-4 py-2.5 bg-white text-gray-700 font-bold rounded-xl shadow-[0_8px_30px_rgb(0,0,0,0.03)] hover:text-emerald-600 transition-colors whitespace-nowrap">
             <Calendar className="w-4 h-4 text-emerald-500" /> বাজার শিডিউল
           </button>
           {isManagerOrAdmin && (
             <button onClick={() => router.push('/report/single')} className="flex items-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl shadow-md transition-colors whitespace-nowrap">
               <FileText className="w-4 h-4" /> লেনদেন ম্যানেজ
             </button>
           )}
        </div>
      </div>

      {/* Recent Notice Alert Banner */}
      {recentNotice && (
        <div 
          onClick={() => router.push('/notice')}
          className="cursor-pointer bg-gradient-to-r from-rose-500/10 via-orange-500/10 to-amber-500/10 hover:from-rose-500/20 hover:to-amber-500/20 text-gray-900 rounded-3xl p-5 shadow-[0_8px_30px_rgb(244,63,94,0.03)] flex items-center justify-between gap-4 border border-rose-100/50 transition-all duration-300 group"
        >
          <div className="flex items-center gap-4 min-w-0">
            <div className="w-11 h-11 bg-rose-500 text-white rounded-2xl flex items-center justify-center shadow-lg shadow-rose-200 flex-shrink-0 animate-pulse">
              <Bell className="w-5.5 h-5.5" />
            </div>
            <div className="min-w-0">
              <span className="text-[10px] font-black text-rose-600 bg-rose-50 px-2.5 py-0.5 rounded-full uppercase tracking-wider">মেস নোটিশ (New announcement)</span>
              <p className="font-extrabold text-sm text-gray-800 mt-1 truncate">
                {recentNotice.createdBy?.name ? recentNotice.createdBy.name.split(' ')[0] : 'অ্যাডমিন'} ({recentNotice.createdBy?.role || 'ম্যানেজার'}) একটি গুরুত্বপূর্ণ নোটিশ পোস্ট করেছেন: "{recentNotice.title}"
              </p>
              <p className="text-[10px] font-bold text-gray-400 mt-0.5">
                পোস্টের সময়: {formatSafeDate(recentNotice.createdAt)} • বিস্তারিত পড়তে এখানে ক্লিক করুন
              </p>
            </div>
          </div>
          <div className="w-8 h-8 rounded-xl bg-gray-50 flex items-center justify-center text-gray-400 group-hover:text-rose-600 group-hover:bg-rose-50 transition-all flex-shrink-0">
            <ChevronRight className="w-4.5 h-4.5" />
          </div>
        </div>
      )}

      {/* Low Balance Warning Banner */}
      {myStats && myStats.balance <= 0 && (
        <div 
          onClick={() => router.push('/deposit')}
          className="cursor-pointer bg-gradient-to-r from-rose-50 to-red-50 text-rose-800 rounded-3xl p-5 shadow-[0_8px_30px_rgb(244,63,94,0.02)] flex items-center justify-between gap-4 border border-rose-100/60 transition-all duration-300 hover:scale-[1.005] group"
        >
          <div className="flex items-center gap-4 min-w-0">
            <div className="w-11 h-11 bg-rose-600 text-white rounded-2xl flex items-center justify-center shadow-lg shadow-rose-200 flex-shrink-0 animate-pulse">
              <AlertCircle className="w-5.5 h-5.5" />
            </div>
            <div className="min-w-0">
              <span className="text-[10px] font-black text-rose-600 bg-rose-100/50 px-2.5 py-0.5 rounded-full uppercase tracking-wider">জরুরি সতর্কতা (Balance Alert)</span>
              <p className="font-extrabold text-sm text-gray-800 mt-1">
                আপনার ব্যালেন্স শেষ অথবা ঋণাত্মক ({myStats.balance.toFixed(0)} ৳)! মেসের মিল ও হিসাব সচল রাখতে দ্রুত টাকা জমা করুন।
              </p>
              <p className="text-[10px] font-bold text-gray-400 mt-0.5">
                জমা দিতে এখানে ক্লিক করুন • জমা না করা পর্যন্ত এই সতর্কতাটি প্রদর্শিত হতে থাকবে
              </p>
            </div>
          </div>
          <div className="w-8 h-8 rounded-xl bg-white border border-rose-100/40 flex items-center justify-center text-rose-500 group-hover:bg-rose-500 group-hover:text-white transition-all flex-shrink-0">
            <ChevronRight className="w-4.5 h-4.5" />
          </div>
        </div>
      )}

      {/* Global Month Statistics Card - Light Premium Theme with box shadow */}
      <div suppressHydrationWarning className="relative bg-gradient-to-br from-indigo-50/90 via-white/80 to-blue-50/90 text-gray-900 rounded-[2.5rem] p-6 md:p-8 shadow-[0_12px_40px_rgb(99,102,241,0.06)] overflow-hidden">
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
               <p className="text-xs text-indigo-600 font-bold bg-indigo-50/80 px-2.5 py-0.5 rounded-full mt-1 inline-block">
                 {globalStats.monthName === 'কোনো চলমান মাস নেই' ? 'কোনো চলমান মাস নেই' : `${globalStats.monthName} (চলমান মাস)`}
               </p>
             </div>
          </div>
          <button 
            onClick={() => router.push('/report/single')}
            className="flex items-center gap-2 px-5 py-2.5 bg-white hover:bg-gray-50 text-indigo-600 font-bold rounded-xl transition-all text-xs shadow-[0_8px_30px_rgb(0,0,0,0.03)]"
          >
            <FileText className="w-4 h-4" />
            বিস্তারিত রিপোর্ট
          </button>
        </div>

        <div suppressHydrationWarning className="relative z-10 grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-4">
          <div suppressHydrationWarning className="bg-white/85 backdrop-blur-md p-4 rounded-xl shadow-[0_8px_30px_rgb(0,0,0,0.015)]">
             <p className="text-xs font-bold text-emerald-600 mb-1 flex items-center gap-1"><Wallet className="w-3.5 h-3.5"/> ব্যালেন্স</p>
             <p className="text-lg font-black text-gray-900">{globalStats.balance.toFixed(1)} ৳</p>
          </div>
          <div suppressHydrationWarning className="bg-white/85 backdrop-blur-md p-4 rounded-xl shadow-[0_8px_30px_rgb(0,0,0,0.015)]">
             <p className="text-xs font-bold text-blue-600 mb-1 flex items-center gap-1"><ArrowUpRight className="w-3.5 h-3.5"/> মোট জমা</p>
             <p className="text-lg font-black text-gray-900">{globalStats.totalDeposit.toFixed(0)} ৳</p>
          </div>
          <div suppressHydrationWarning className="bg-white/85 backdrop-blur-md p-4 rounded-xl shadow-[0_8px_30px_rgb(0,0,0,0.015)]">
             <p className="text-xs font-bold text-amber-600 mb-1 flex items-center gap-1"><Utensils className="w-3.5 h-3.5"/> মোট মিল</p>
             <p className="text-lg font-black text-gray-900">{globalStats.totalMeals.toFixed(1)}</p>
          </div>
          <div suppressHydrationWarning className="bg-white/85 backdrop-blur-md p-4 rounded-xl shadow-[0_8px_30px_rgb(0,0,0,0.015)]">
             <p className="text-xs font-bold text-rose-600 mb-1 flex items-center gap-1"><TrendingDown className="w-3.5 h-3.5"/> মিল খরচ</p>
             <p className="text-lg font-black text-gray-900">{globalStats.mealExpenses.toFixed(0)} ৳</p>
          </div>
          <div suppressHydrationWarning className="bg-white/85 backdrop-blur-md p-4 rounded-xl shadow-[0_8px_30px_rgb(0,0,0,0.015)]">
             <p className="text-xs font-bold text-indigo-600 mb-1 flex items-center gap-1"><Receipt className="w-3.5 h-3.5"/> মিল রেট</p>
             <p className="text-lg font-black text-gray-900">{globalStats.mealRate.toFixed(2)} ৳</p>
          </div>
          <div suppressHydrationWarning className="bg-white/85 backdrop-blur-md p-4 rounded-xl shadow-[0_8px_30px_rgb(0,0,0,0.015)]">
             <p className="text-xs font-bold text-purple-600 mb-1 flex items-center gap-1"><ShoppingBag className="w-3.5 h-3.5"/> একক খরচ</p>
             <p className="text-lg font-black text-gray-900">{globalStats.singleExpenses?.toFixed(0) || '0'} ৳</p>
          </div>
          <div suppressHydrationWarning className="bg-white/85 backdrop-blur-md p-4 rounded-xl shadow-[0_8px_30px_rgb(0,0,0,0.015)]">
             <p className="text-xs font-bold text-teal-600 mb-1 flex items-center gap-1"><Users className="w-3.5 h-3.5"/> যৌথ খরচ</p>
             <p className="text-lg font-black text-gray-900">{globalStats.jointExpenses?.toFixed(0) || '0'} ৳</p>
          </div>
        </div>
      </div>

      {/* Main Grid: My Stats, Menu, Quick Meal, Bazaar Schedule */}
      <div suppressHydrationWarning className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* Column 1: My Stats, Menu & Quick Meal (Takes 8 columns) */}
        <div suppressHydrationWarning className="lg:col-span-8 space-y-8">
          
          {/* My Stats Widget */}
          <div suppressHydrationWarning>
            <div suppressHydrationWarning className="flex items-center gap-2.5 mb-4">
              <Sparkles className="w-5 h-5 text-indigo-500 animate-pulse" />
              <h2 className="text-2xl font-extrabold text-gray-900">আমার বর্তমান হিসাব</h2>
            </div>
            
            <div suppressHydrationWarning className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              {/* Meals */}
              <div suppressHydrationWarning className="bg-white rounded-2xl p-5 shadow-[0_8px_30px_rgb(0,0,0,0.03)] relative overflow-hidden group hover:shadow-md transition-shadow">
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
              <div suppressHydrationWarning className="bg-white rounded-2xl p-5 shadow-[0_8px_30px_rgb(0,0,0,0.03)] relative overflow-hidden group hover:shadow-md transition-shadow">
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
              <div suppressHydrationWarning className="bg-white rounded-2xl p-5 shadow-[0_8px_30px_rgb(0,0,0,0.03)] relative overflow-hidden group hover:shadow-md transition-shadow">
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
              <div suppressHydrationWarning className="bg-white rounded-2xl p-5 shadow-[0_8px_30px_rgb(0,0,0,0.03)] relative overflow-hidden group hover:shadow-md transition-shadow">
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

          {/* Today's Cooking Menu Widget (Unique and Mess-Related Feature) */}
          <div suppressHydrationWarning className="bg-white shadow-[0_8px_30px_rgb(0,0,0,0.03)] rounded-3xl p-6 relative overflow-hidden">
            <div className="flex items-center justify-between mb-4 border-b border-gray-50 pb-3">
              <div className="flex items-center gap-2">
                <ChefHat className="w-5 h-5 text-orange-500 animate-pulse" />
                <h3 className="font-extrabold text-gray-900 text-lg">আজকের রান্নার মেনু (Cooking Menu)</h3>
              </div>
              <div className="flex gap-2">
                {isManagerOrAdmin && allMenuRatings.length > 0 && (
                  <button
                    onClick={() => setShowRatingsDetailModal(true)}
                    className="text-[10px] font-extrabold text-amber-600 bg-amber-50 px-2.5 py-1.5 rounded-xl hover:bg-amber-100 transition-colors flex items-center gap-1"
                  >
                    ⭐ রিভিউ বিবরণী ({menuAverages.totalCount} জন)
                  </button>
                )}
                {isManagerOrAdmin && !isEditingMenu && (
                  <button
                    onClick={() => setIsEditingMenu(true)}
                    className="text-xs font-extrabold text-indigo-600 bg-indigo-50 px-3 py-1.5 rounded-xl hover:bg-indigo-100 transition-colors"
                  >
                    মেনু আপডেট করুন
                  </button>
                )}
              </div>
            </div>

            {isEditingMenu ? (
              <form onSubmit={handleMenuSubmit} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-[11px] font-bold text-gray-500 mb-1 uppercase">🍳 সকাল</label>
                    <input
                      type="text"
                      value={menuBreakfast}
                      onChange={(e) => setMenuBreakfast(e.target.value)}
                      placeholder="যেমন: ডিম খিচুড়ি"
                      className="w-full px-3 py-2 bg-gray-50 rounded-xl text-xs font-bold border border-gray-150 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-gray-500 mb-1 uppercase">🍛 দুপুর</label>
                    <input
                      type="text"
                      value={menuLunch}
                      onChange={(e) => setMenuLunch(e.target.value)}
                      placeholder="যেমন: মুরগির মাংস, ডাল"
                      className="w-full px-3 py-2 bg-gray-50 rounded-xl text-xs font-bold border border-gray-150 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-gray-500 mb-1 uppercase">🍲 রাত</label>
                    <input
                      type="text"
                      value={menuDinner}
                      onChange={(e) => setMenuDinner(e.target.value)}
                      placeholder="যেমন: মাছের ঝোল, আলুভর্তা"
                      className="w-full px-3 py-2 bg-gray-50 rounded-xl text-xs font-bold border border-gray-150 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 outline-none"
                    />
                  </div>
                </div>
                <div className="flex justify-end gap-2 text-xs font-bold pt-2">
                  <button
                    type="button"
                    onClick={() => { setIsEditingMenu(false); fetchMenuAndNotices(); }}
                    className="px-4 py-2 bg-gray-50 hover:bg-gray-100 text-gray-600 rounded-xl transition-colors"
                  >
                    বাতিল
                  </button>
                  <button
                    type="submit"
                    disabled={menuSubmitLoading}
                    className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl transition-colors flex items-center gap-1.5 shadow-md shadow-indigo-100"
                  >
                    {menuSubmitLoading ? 'আপডেট হচ্ছে...' : 'সংরক্ষণ করুন'}
                  </button>
                </div>
              </form>
            ) : (
              <div className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  {/* Breakfast */}
                  <div className="bg-orange-50/30 p-3.5 rounded-2xl border border-orange-50/50 flex flex-col justify-between min-h-[90px]">
                    <div className="flex items-start gap-3">
                      <span className="text-xl flex-shrink-0">🍳</span>
                      <div className="flex-1 min-w-0">
                        <div className="flex justify-between items-center w-full">
                          <p className="text-[10px] font-bold text-orange-500 uppercase tracking-wider">সকালের মেনু</p>
                          {menuAverages.breakfast > 0 && (
                            <span className="text-[9px] bg-orange-100 text-orange-700 px-1.5 py-0.5 rounded-md font-extrabold flex items-center gap-0.5">
                              ⭐ {menuAverages.breakfast}
                            </span>
                          )}
                        </div>
                        <p className="font-extrabold text-gray-900 mt-0.5 text-sm">{menu?.breakfast || 'আপডেট করা হয়নি'}</p>
                      </div>
                    </div>
                    {menu?.breakfast && (
                      <div className="mt-3 pt-2 border-t border-orange-100/50 flex items-center justify-between">
                        <span className="text-[9px] font-bold text-gray-400">রেটিং দিন:</span>
                        <div className="flex gap-0.5">
                          {[1, 2, 3, 4, 5].map((star) => (
                            <button
                              key={star}
                              type="button"
                              onClick={() => handleRateMenu('breakfast', star)}
                              className="focus:outline-none transition-transform hover:scale-125"
                            >
                              <span className={cn("text-xs", star <= breakfastRating ? "text-amber-500" : "text-gray-300")}>★</span>
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Lunch */}
                  <div className="bg-blue-50/30 p-3.5 rounded-2xl border border-blue-50/50 flex flex-col justify-between min-h-[90px]">
                    <div className="flex items-start gap-3">
                      <span className="text-xl flex-shrink-0">🍛</span>
                      <div className="flex-1 min-w-0">
                        <div className="flex justify-between items-center w-full">
                          <p className="text-[10px] font-bold text-blue-500 uppercase tracking-wider">দুপুরের মেনু</p>
                          {menuAverages.lunch > 0 && (
                            <span className="text-[9px] bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded-md font-extrabold flex items-center gap-0.5">
                              ⭐ {menuAverages.lunch}
                            </span>
                          )}
                        </div>
                        <p className="font-extrabold text-gray-900 mt-0.5 text-sm">{menu?.lunch || 'আপডেট করা হয়নি'}</p>
                      </div>
                    </div>
                    {menu?.lunch && (
                      <div className="mt-3 pt-2 border-t border-blue-100/50 flex items-center justify-between">
                        <span className="text-[9px] font-bold text-gray-400">রেটিং দিন:</span>
                        <div className="flex gap-0.5">
                          {[1, 2, 3, 4, 5].map((star) => (
                            <button
                              key={star}
                              type="button"
                              onClick={() => handleRateMenu('lunch', star)}
                              className="focus:outline-none transition-transform hover:scale-125"
                            >
                              <span className={cn("text-xs", star <= lunchRating ? "text-amber-500" : "text-gray-300")}>★</span>
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Dinner */}
                  <div className="bg-emerald-50/30 p-3.5 rounded-2xl border border-emerald-50/50 flex flex-col justify-between min-h-[90px]">
                    <div className="flex items-start gap-3">
                      <span className="text-xl flex-shrink-0">🍲</span>
                      <div className="flex-1 min-w-0">
                        <div className="flex justify-between items-center w-full">
                          <p className="text-[10px] font-bold text-emerald-500 uppercase tracking-wider">রাতের মেনু</p>
                          {menuAverages.dinner > 0 && (
                            <span className="text-[9px] bg-emerald-100 text-emerald-700 px-1.5 py-0.5 rounded-md font-extrabold flex items-center gap-0.5">
                              ⭐ {menuAverages.dinner}
                            </span>
                          )}
                        </div>
                        <p className="font-extrabold text-gray-900 mt-0.5 text-sm">{menu?.dinner || 'আপডেট করা হয়নি'}</p>
                      </div>
                    </div>
                    {menu?.dinner && (
                      <div className="mt-3 pt-2 border-t border-emerald-100/50 flex items-center justify-between">
                        <span className="text-[9px] font-bold text-gray-400">রেটিং দিন:</span>
                        <div className="flex gap-0.5">
                          {[1, 2, 3, 4, 5].map((star) => (
                            <button
                              key={star}
                              type="button"
                              onClick={() => handleRateMenu('dinner', star)}
                              className="focus:outline-none transition-transform hover:scale-125"
                            >
                              <span className={cn("text-xs", star <= dinnerRating ? "text-amber-500" : "text-gray-300")}>★</span>
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Food satisfaction summary bar */}
                {(menuAverages.breakfast > 0 || menuAverages.lunch > 0 || menuAverages.dinner > 0) && (
                  <div className="p-3.5 bg-orange-50/50 border border-orange-100/50 rounded-2xl flex items-center justify-between gap-3 text-xs text-orange-850 font-bold animate-fadeIn">
                    <span className="flex items-center gap-1.5">🍽️ আজকের খাবারের রিভিউ বাজার কারিগরের নিকট পাঠানো হয়েছে।</span>
                    <span className="bg-orange-100 text-orange-800 px-3 py-1 rounded-full text-[10px] font-black tracking-wider uppercase animate-pulse">
                      গড় সন্তুষ্টি: {Math.round(((menuAverages.breakfast + menuAverages.lunch + menuAverages.dinner) / ( (menuAverages.breakfast?1:0) + (menuAverages.lunch?1:0) + (menuAverages.dinner?1:0) || 1 )) * 20)}%
                    </span>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Quick Meal Planner / Requester */}
          <div suppressHydrationWarning className="bg-white shadow-[0_8px_30px_rgb(0,0,0,0.03)] rounded-3xl p-6 relative overflow-hidden">
            <div className="flex items-center justify-between mb-4 border-b border-gray-50 pb-3">
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
                <div className="bg-gray-50/60 rounded-2xl p-4 flex flex-col justify-between">
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
                      <div className="flex items-center justify-between bg-white p-3 rounded-xl shadow-sm">
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
                      <div className="flex items-center justify-between bg-white p-3 rounded-xl shadow-sm">
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
                      <div className="flex items-center justify-between bg-white p-3 rounded-xl shadow-sm">
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
                        <div className="mt-3 text-[11px] font-bold text-gray-500 bg-white p-2.5 rounded-xl flex justify-between items-center shadow-[0_4px_20px_rgb(0,0,0,0.01)]">
                          <span>বর্তমান মিল:</span>
                          <span className="text-indigo-600 bg-indigo-50/50 px-2 py-0.5 rounded-md">
                            সকাল: {myMeals.today.breakfast}, দুপুর: {myMeals.today.lunch}, রাত: {myMeals.today.dinner}
                          </span>
                        </div>
                      )}
                      {/* Show pending request if exists */}
                      {!isManagerOrAdmin && myMeals.pendingToday && (
                        <div className="mt-2 text-[11px] font-extrabold text-amber-700 bg-amber-50 p-2.5 rounded-xl flex justify-between items-center animate-pulse">
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
                <div className="bg-gray-50/60 rounded-2xl p-4 flex flex-col justify-between">
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
                      <div className="flex items-center justify-between bg-white p-3 rounded-xl shadow-sm">
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
                      <div className="flex items-center justify-between bg-white p-3 rounded-xl shadow-sm">
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
                      <div className="flex items-center justify-between bg-white p-3 rounded-xl shadow-sm">
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
                        <div className="mt-3 text-[11px] font-bold text-gray-500 bg-white p-2.5 rounded-xl flex justify-between items-center shadow-[0_4px_20px_rgb(0,0,0,0.01)]">
                          <span>বর্তমান মিল:</span>
                          <span className="text-indigo-600 bg-indigo-50/50 px-2 py-0.5 rounded-md">
                            সকাল: {myMeals.tomorrow.breakfast}, দুপুর: {myMeals.tomorrow.lunch}, রাত: {myMeals.tomorrow.dinner}
                          </span>
                        </div>
                      )}
                      {/* Show pending request if exists */}
                      {!isManagerOrAdmin && myMeals.pendingTomorrow && (
                        <div className="mt-2 text-[11px] font-extrabold text-amber-700 bg-amber-50 p-2.5 rounded-xl flex justify-between items-center animate-pulse">
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

          {/* Meal Cost Estimator Widget (Unique and Premium) */}
          <div suppressHydrationWarning className="bg-white shadow-[0_8px_30px_rgb(0,0,0,0.03)] rounded-3xl p-6 relative overflow-hidden">
            <div className="flex items-center gap-2 mb-4 border-b border-gray-50 pb-3">
              <Calculator className="w-5 h-5 text-indigo-500 animate-pulse" />
              <div>
                <h3 className="font-extrabold text-gray-900 text-base">খাবারের খরচ ও মিল ক্যালকুলেটর</h3>
                <p className="text-[11px] font-semibold text-gray-400 mt-0.5">আপনার আনুমানিক মাসিক খরচ হিসাব করুন</p>
              </div>
            </div>

            <div className="space-y-4">
              {/* Row 1: Daily Meals (Inputs + Buttons) */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-gray-50/60 p-4 rounded-2xl">
                <div>
                  <label className="block text-xs font-bold text-gray-700">প্রতিদিনের আনুমানিক মিল সংখ্যা:</label>
                  <p className="text-[10px] text-gray-400 font-semibold mt-0.5">১ দিনে আপনি গড়ে কয়টি মিল খাবেন?</p>
                </div>
                <div className="flex items-center gap-2 bg-white px-2.5 py-1.5 rounded-xl border border-gray-150 shadow-sm">
                  <button 
                    type="button"
                    onClick={() => setEstDailyMeals(prev => Math.max(0, parseFloat((prev - 0.5).toFixed(1))))}
                    className="w-7 h-7 hover:bg-gray-55 rounded-lg flex items-center justify-center font-black text-gray-650 text-xs transition-colors"
                  >
                    -
                  </button>
                  <input 
                    type="number"
                    step="0.1"
                    min="0"
                    max="10"
                    value={estDailyMeals === 0 ? '' : estDailyMeals}
                    onChange={(e) => {
                      const val = parseFloat(e.target.value);
                      setEstDailyMeals(isNaN(val) ? 0 : val);
                    }}
                    className="w-12 text-center text-sm font-black text-gray-900 focus:outline-none border-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                  />
                  <button 
                    type="button"
                    onClick={() => setEstDailyMeals(prev => Math.min(10, parseFloat((prev + 0.5).toFixed(1))))}
                    className="w-7 h-7 hover:bg-gray-55 rounded-lg flex items-center justify-center font-black text-gray-655 text-xs transition-colors"
                  >
                    +
                  </button>
                </div>
              </div>

              {/* Row 2: Custom Meal Rate Input */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-gray-50/60 p-4 rounded-2xl">
                <div>
                  <label className="block text-xs font-bold text-gray-700">মিল রেট (Meal Rate):</label>
                  <p className="text-[10px] text-gray-400 font-semibold mt-0.5">হিসেব করার জন্য মিল রেট পরিবর্তন করুন</p>
                </div>
                <div className="flex items-center gap-1.5 bg-white px-3 py-1.5 rounded-xl border border-gray-150 shadow-sm">
                  <input 
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder={`${globalStats.mealRate?.toFixed(2) || '40.00'}`}
                    value={customMealRate}
                    onChange={(e) => setCustomMealRate(e.target.value)}
                    className="w-20 text-right text-xs font-black text-gray-900 focus:outline-none border-none"
                  />
                  <span className="text-xs font-bold text-gray-400">৳</span>
                </div>
              </div>

              {/* Live calculations */}
              {(() => {
                const liveRate = globalStats.mealRate || 40;
                const parsedRate = parseFloat(customMealRate);
                const rateToUse = isNaN(parsedRate) || parsedRate <= 0 ? liveRate : parsedRate;
                const monthlyMeals = estDailyMeals * 30;
                const estimatedCost = monthlyMeals * rateToUse;
                const currentDeposit = myStats.deposit || 0;
                const extraNeeded = Math.max(0, estimatedCost - currentDeposit);
                const isSufficient = currentDeposit >= estimatedCost;

                return (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="bg-indigo-50/20 border border-indigo-50/50 p-3.5 rounded-2xl">
                      <p className="text-[9px] font-bold text-indigo-500 uppercase tracking-wider">আনুমানিক মাসিক খরচ</p>
                      <p className="text-xl font-black text-gray-900 mt-1">{estimatedCost.toFixed(0)} ৳</p>
                      <p className="text-[10px] font-bold text-gray-400 mt-0.5">মিল রেট: {rateToUse.toFixed(2)} ৳ হিসেবে</p>
                    </div>

                    <div className={cn(
                      "p-3.5 rounded-2xl border",
                      isSufficient 
                        ? "bg-emerald-50/20 border-emerald-100/50 text-emerald-800" 
                        : "bg-rose-50/20 border-rose-100/50 text-rose-800"
                    )}>
                      <p className={cn(
                        "text-[9px] font-bold uppercase tracking-wider",
                        isSufficient ? "text-emerald-600" : "text-rose-600"
                      )}>
                        {isSufficient ? "ডিপোজিট পর্যাপ্ত ✅" : "আরও ডিপোজিট লাগবে ⚠️"}
                      </p>
                      <p className="text-xl font-black mt-1">
                        {isSufficient ? "৳ ০.০০" : `${extraNeeded.toFixed(0)} ৳`}
                      </p>
                      <p className="text-[10px] font-bold text-gray-400 mt-0.5">
                        {isSufficient ? "আপনার জমা পর্যাপ্ত আছে" : "বাজেট মেলাতে জমা করতে হবে"}
                      </p>
                    </div>
                  </div>
                );
              })()}
            </div>
          </div>

          {/* Pending Meal Requests Panel (Only visible to Managers/Admins) */}
          {isManagerOrAdmin && pendingRequests.length > 0 && (
            <div suppressHydrationWarning className="bg-white shadow-[0_8px_30px_rgb(245,158,11,0.04)] rounded-3xl p-6 relative overflow-hidden">
              <div className="flex items-center gap-2 mb-4 border-b border-amber-50 pb-3">
                <Crown className="w-5 h-5 text-amber-500" />
                <h3 className="font-extrabold text-gray-900 text-lg">মেম্বারদের মিল পরিবর্তনের অনুরোধ ({pendingRequests.length})</h3>
              </div>
              
              <div className="space-y-4 max-h-[300px] overflow-y-auto scrollbar-thin">
                {pendingRequests.map((req) => (
                  <div key={req._id} className="bg-amber-50/30 border border-amber-100/50 p-4 rounded-2xl flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-800 flex items-center justify-center font-bold flex-shrink-0">
                        {(req.userId?.name?.charAt(0) || 'U').toUpperCase()}
                      </div>
                      <div>
                        <p className="font-bold text-gray-900 text-sm capitalize">{req.userId?.name}</p>
                        <p className="text-[10px] font-bold text-gray-500">
                          তারিখ: {formatSafeDate(req.date)}
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

          {/* Future Balance Projector Widget */}
          {myStats && globalStats && (
            <div suppressHydrationWarning className="bg-white rounded-3xl p-6 shadow-[0_8px_30px_rgb(0,0,0,0.03)] border border-gray-100/50 flex flex-col relative overflow-hidden">
              <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none">
                <Calculator className="w-24 h-24 text-indigo-600" />
              </div>
              
              <div className="relative z-10 space-y-4">
                <h3 className="font-extrabold text-gray-955 text-base flex items-center gap-2">
                  <Calculator className="w-5 h-5 text-indigo-500" />
                  ব্যালেন্স প্রজেকশন ক্যালকুলেটর
                </h3>
                <p className="text-[10px] text-gray-400 font-bold leading-relaxed">
                  বাকি দিনগুলোর আনুমানিক মিল দিয়ে চেক করুন মাসের শেষে আপনার সম্ভাব্য ব্যালেন্স এবং বাজেট ঘাটতি।
                </p>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-[10px] font-extrabold text-gray-500 uppercase tracking-wider">বাকি মিল সংখ্যা</label>
                    <input 
                      type="number"
                      value={estMeals}
                      onChange={(e) => setEstMeals(e.target.value)}
                      placeholder="যেমন: ১৫"
                      className="w-full px-3 py-2 bg-gray-50 border border-gray-100 rounded-xl text-xs font-bold text-gray-900 focus:outline-none focus:border-indigo-200"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-extrabold text-gray-500 uppercase tracking-wider">অতিরিক্ত একক খরচ</label>
                    <input 
                      type="number"
                      value={estSingleExp}
                      onChange={(e) => setEstSingleExp(e.target.value)}
                      placeholder="যেমন: ২০০ ৳"
                      className="w-full px-3 py-2 bg-gray-50 border border-gray-100 rounded-xl text-xs font-bold text-gray-900 focus:outline-none focus:border-indigo-200"
                    />
                  </div>
                </div>

                {/* Projection Results */}
                {(() => {
                  const currentMeals = myStats.totalMeal || 0;
                  const currentDeposit = myStats.deposit || 0;
                  const currentSingle = myStats.singleCost || 0;
                  const currentJoint = myStats.jointCost || 0;
                  const mealRate = globalStats.mealRate || 0;

                  const remainingMealsVal = parseFloat(estMeals) || 0;
                  const extraSingleVal = parseFloat(estSingleExp) || 0;

                  const projectedMeals = currentMeals + remainingMealsVal;
                  const projectedMealCost = projectedMeals * mealRate;
                  const projectedSingleCost = currentSingle + extraSingleVal;
                  
                  const projectedTotalCost = projectedMealCost + currentJoint + projectedSingleCost;
                  const projectedBalance = currentDeposit - projectedTotalCost;
                  const shortfall = projectedBalance < 0 ? Math.abs(projectedBalance) : 0;

                  return (
                    <div className="space-y-3 pt-2 mt-2 border-t border-gray-100 text-xs font-bold">
                      <div className="flex justify-between text-gray-500 text-[10px]">
                        <span>প্রজেক্টেড মিল খরচ:</span>
                        <span className="text-gray-900 font-extrabold">{projectedMealCost.toFixed(1)} ৳</span>
                      </div>
                      <div className="flex justify-between text-gray-500 text-[10px]">
                        <span>প্রজেক্টেড মোট খরচ:</span>
                        <span className="text-gray-900 font-extrabold">{projectedTotalCost.toFixed(0)} ৳</span>
                      </div>
                      
                      <div className="flex items-center justify-between p-3.5 bg-gray-50/50 rounded-2xl border border-gray-100 mt-2">
                        <div>
                          <p className="text-[9px] text-gray-400 font-bold uppercase tracking-wider">সম্ভাব্য শেষ ব্যালেন্স</p>
                          <p className={`text-base font-black mt-1 ${projectedBalance >= 0 ? 'text-emerald-600' : 'text-rose-600 animate-pulse'}`}>
                            {projectedBalance >= 0 ? '+' : ''}{projectedBalance.toFixed(0)} ৳
                          </p>
                        </div>
                        {shortfall > 0 && (
                          <div className="text-right">
                            <span className="inline-block px-2 py-0.5 bg-rose-50 text-rose-600 border border-rose-100 rounded-md text-[9px] font-black uppercase tracking-wider animate-pulse">ঘাটতি</span>
                            <p className="text-xs font-black text-rose-700 mt-0.5">জমা করতে হবে: {shortfall.toFixed(0)} ৳</p>
                          </div>
                        )}
                      </div>

                      {shortfall > 0 && (
                        <button 
                          onClick={() => router.push('/deposit')}
                          className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold text-center block transition-all mt-2 text-[10px] tracking-wide shadow-md"
                        >
                          দ্রুত টাকা জমা দিন
                        </button>
                      )}
                    </div>
                  );
                })()}
              </div>
            </div>
          )}

          {/* Subgrid: Smart Budget Advisor */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* Smart Budget Advisor Card */}
            {myStats && myStats.totalCost !== undefined && (
              <div suppressHydrationWarning className="bg-white rounded-3xl p-6 shadow-[0_8px_30px_rgb(0,0,0,0.03)] flex flex-col relative overflow-hidden">
                <div suppressHydrationWarning className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none">
                  <Sparkles className="w-24 h-24 text-indigo-600" />
                </div>

                <div suppressHydrationWarning className="relative z-10 flex-1 flex flex-col space-y-4">
                  <h3 className="font-extrabold text-gray-955 text-base flex items-center gap-2">
                    <Sparkles className="w-5 h-5 text-indigo-500" />
                    স্মার্ট বাজেট অ্যাডভাইজর
                  </h3>
                  
                  {(() => {
                    const elapsedDays = Math.max(1, new Date().getDate());
                    const dailyAvg = myStats.totalCost / elapsedDays;
                    const projectedCost = dailyAvg * 30;
                    const daysLeft = dailyAvg > 0 && myStats.balance > 0 ? Math.floor(myStats.balance / dailyAvg) : 0;
                    
                    let adviceTitle = "বাজেট ব্যালেন্স নিরাপদ ✅";
                    let adviceDesc = `বর্তমান খরচ অনুযায়ী এই মাস আপনার ব্যালেন্স পর্যাপ্ত আছে। আপনার জমাকৃত টাকায় আরও আনুমানিক ${daysLeft} দিন চলবে।`;
                    let adviceBg = "bg-emerald-50 border-emerald-100 text-emerald-800";
                    let badgeIcon = "👍";

                    if (myStats.balance <= 0) {
                      adviceTitle = "ব্যালেন্স শেষ / ঋণাত্মক ⚠️";
                      adviceDesc = "আপনার ব্যালেন্স শেষ হয়ে গেছে। মেসের মিল ও হিসাব সচল রাখতে দ্রুত টাকা জমা দিন।";
                      adviceBg = "bg-rose-50 border-rose-100 text-rose-800";
                      badgeIcon = "🚨";
                    } else if (daysLeft <= 5) {
                      adviceTitle = "দ্রুত ব্যালেন্স শেষ হচ্ছে ⏳";
                      adviceDesc = `সতর্কতা! আপনার বর্তমান খরচ অনুযায়ী আগামী ${daysLeft} দিনের মধ্যে ব্যালেন্স শেষ হতে পারে।`;
                      adviceBg = "bg-amber-50 border-amber-100 text-amber-800";
                      badgeIcon = "⚠️";
                    }

                    return (
                      <div className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                          <div className="bg-gray-50/80 p-3 rounded-2xl border border-gray-100">
                            <p className="text-[9px] font-bold text-gray-400 uppercase tracking-wider">দৈনিক গড় খরচ</p>
                            <p className="text-base font-black text-gray-900 mt-1">{dailyAvg.toFixed(1)} ৳</p>
                          </div>
                          <div className="bg-gray-50/80 p-3 rounded-2xl border border-gray-100">
                            <p className="text-[9px] font-bold text-gray-400 uppercase tracking-wider">মাসিক আনুমানিক খরচ</p>
                            <p className="text-base font-black text-gray-900 mt-1">{projectedCost.toFixed(0)} ৳</p>
                          </div>
                        </div>

                        <div className={cn("p-4 rounded-2xl border text-xs font-bold leading-relaxed flex items-start gap-2.5", adviceBg)}>
                          <span className="text-lg flex-shrink-0">{badgeIcon}</span>
                          <div>
                            <p className="font-extrabold text-[13px] mb-0.5">{adviceTitle}</p>
                            <p className="text-[11px] opacity-90">{adviceDesc}</p>
                          </div>
                        </div>
                      </div>
                    );
                  })()}
                </div>
              </div>
            )}

            {/* Cost Distribution Chart Card */}
            {myStats && myStats.totalCost > 0 && (
              <div suppressHydrationWarning className="bg-white rounded-3xl p-6 shadow-[0_8px_30px_rgb(0,0,0,0.03)] flex flex-col relative overflow-hidden">
                <h3 className="font-extrabold text-gray-955 text-base mb-4 flex items-center gap-2">
                  <Receipt className="w-5 h-5 text-indigo-500" />
                  আমার খরচ বিভাজন
                </h3>

                {(() => {
                  const total = myStats.mealCost + myStats.jointCost + myStats.singleCost || 1;
                  const mealPct = Math.round((myStats.mealCost / total) * 100);
                  const jointPct = Math.round((myStats.jointCost / total) * 100);
                  const singlePct = Math.round((myStats.singleCost / total) * 100);

                  return (
                    <div className="space-y-4 text-xs font-bold text-gray-700">
                      <div className="space-y-1.5">
                        <div className="flex justify-between items-center text-[10px]">
                          <span className="flex items-center gap-1.5"><Utensils className="w-3.5 h-3.5 text-orange-500" /> মিল বাবদ খরচ ({mealPct}%)</span>
                          <span className="text-gray-900 font-extrabold">{myStats.mealCost.toFixed(0)} ৳</span>
                        </div>
                        <div className="w-full bg-gray-100 h-2.5 rounded-full overflow-hidden">
                          <div className="h-full bg-orange-500 transition-all duration-500" style={{ width: `${mealPct}%` }}></div>
                        </div>
                      </div>

                      <div className="space-y-1.5">
                        <div className="flex justify-between items-center text-[10px]">
                          <span className="flex items-center gap-1.5"><Users className="w-3.5 h-3.5 text-indigo-500" /> যৌথ মেস খরচ ({jointPct}%)</span>
                          <span className="text-gray-900 font-extrabold">{myStats.jointCost.toFixed(0)} ৳</span>
                        </div>
                        <div className="w-full bg-gray-100 h-2.5 rounded-full overflow-hidden">
                          <div className="h-full bg-indigo-500 transition-all duration-500" style={{ width: `${jointPct}%` }}></div>
                        </div>
                      </div>

                      <div className="space-y-1.5">
                        <div className="flex justify-between items-center text-[10px]">
                          <span className="flex items-center gap-1.5"><CreditCard className="w-3.5 h-3.5 text-teal-500" /> ব্যক্তিগত খরচ ({singlePct}%)</span>
                          <span className="text-gray-900 font-extrabold">{myStats.singleCost.toFixed(0)} ৳</span>
                        </div>
                        <div className="w-full bg-gray-100 h-2.5 rounded-full overflow-hidden">
                          <div className="h-full bg-teal-500 transition-all duration-500" style={{ width: `${singlePct}%` }}></div>
                        </div>
                      </div>
                    </div>
                  );
                })()}
              </div>
            )}
          </div>


        </div>

        {/* Column 2: Bazaar Date, Budget Status, Notice Board & Achievements (4 cols) */}
        <div suppressHydrationWarning className="lg:col-span-4 space-y-8 flex flex-col">
          
          {/* Bazaar Date Card */}
          <div suppressHydrationWarning className="bg-white rounded-3xl p-6 shadow-[0_8px_30px_rgb(0,0,0,0.03)] flex flex-col relative overflow-hidden">
             <div suppressHydrationWarning className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none">
                <Calendar className="w-24 h-24 text-indigo-600" />
             </div>

             <div suppressHydrationWarning className="relative z-10 flex-1 flex flex-col">
               <h3 className="font-extrabold text-gray-950 text-base mb-4 flex items-center gap-2">
                 <Calendar className="w-5 h-5 text-indigo-500" />
                 আমার বাজার শিডিউল
               </h3>
               {(() => {
                 const mySchedule = bazaarSchedules.find(s => s.userId?._id === mongoUser._id && s.status === 'Approved');
                 const myPending = bazaarSchedules.find(s => s.userId?._id === mongoUser._id && s.status === 'Pending');
                 const myCompleted = bazaarSchedules.find(s => s.userId?._id === mongoUser._id && s.status === 'Completed');
                 
                 if (myCompleted) {
                   return (
                     <div className="mb-4">
                       <span className="text-xs font-semibold text-gray-400 block mb-1.5">বাজার স্ট্যাটাস</span>
                       <div className="bg-emerald-50 text-emerald-700 font-bold px-4 py-3.5 rounded-xl text-sm flex items-center gap-2">
                         <CheckCircle2 className="w-4 h-4" /> 
                         এই মাসের বাজার সম্পন্ন হয়েছে!
                       </div>
                     </div>
                   );
                 } else if (mySchedule) {
                   return (
                     <div className="mb-4">
                       <span className="text-xs font-semibold text-gray-400 block mb-1.5">আপনার বাজার তারিখ</span>
                       <div className="bg-gradient-to-r from-indigo-50 to-blue-50 text-indigo-900 font-bold px-4 py-3.5 rounded-xl text-sm">
                         {formatSafeDate(mySchedule.fromDate)} 
                         {' - '} 
                         {formatSafeDate(mySchedule.toDate)}
                       </div>
                     </div>
                   );
                 } else if (myPending) {
                   return (
                     <div className="mb-4">
                       <span className="text-xs font-semibold text-amber-600 block mb-1.5">রিকোয়েস্ট পেন্ডিং</span>
                       <div className="bg-amber-50 text-amber-800 font-bold px-4 py-3.5 rounded-xl text-sm">
                         {formatSafeDate(myPending.fromDate, {})} - {formatSafeDate(myPending.toDate, {})}
                       </div>
                     </div>
                   );
                 } else {
                   return (
                     <div className="mb-4 text-sm text-gray-500 font-medium bg-gray-50 p-4 rounded-xl">
                       কোনো বাজারের ডেট সেট করা নেই
                     </div>
                   );
                 }
               })()}
               
               <div className="mt-4 pt-4 border-t border-gray-100">
                 {isManagerOrAdmin ? (
                   <button 
                     onClick={() => router.push('/bazaar')}
                     className="w-full py-3 bg-gray-900 hover:bg-gray-950 text-white rounded-xl font-bold transition-colors flex items-center justify-center gap-2 text-sm shadow-md"
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

          {/* Mess Budget Health Card (Unique Mess Feature) */}
          <div suppressHydrationWarning className="bg-white rounded-3xl p-6 shadow-[0_8px_30px_rgb(0,0,0,0.03)] space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-xs font-bold text-gray-500 uppercase tracking-wide flex items-center gap-1.5">
                <TrendingDown className="w-4 h-4 text-rose-500" />
                মেস বাজেট খরচ অনুপাত
              </span>
              <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black border ${healthColor}`}>{healthStatus}</span>
            </div>
            
            <div className="w-full bg-gray-100 h-3 rounded-full overflow-hidden">
              <div className={`h-full ${progressColor} transition-all duration-500`} style={{ width: `${Math.min(100, spentPercentage)}%` }}></div>
            </div>
            
            <div className="flex justify-between items-center text-xs font-bold text-gray-500">
              <span>খরচ হয়েছে: {spentPercentage.toFixed(0)}%</span>
              <span>অবশিষ্ট: {Math.max(0, 100 - spentPercentage).toFixed(0)}%</span>
            </div>
          </div>

          {/* Today's Bazaar In-charge Card */}
          <div suppressHydrationWarning className="bg-white rounded-3xl p-6 shadow-[0_8px_30px_rgb(0,0,0,0.03)] flex flex-col relative overflow-hidden">
             <div suppressHydrationWarning className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none">
                <ShoppingBag className="w-24 h-24 text-rose-500" />
             </div>

             <div suppressHydrationWarning className="relative z-10 flex-1 flex flex-col">
               <h3 className="font-extrabold text-gray-955 text-base mb-4 flex items-center gap-2">
                 <ShoppingBag className="w-5 h-5 text-rose-500" />
                 আজকের বাজার কার?
               </h3>
               {(() => {
                 const getTodayBazaarInCharge = () => {
                   if (bazaarSchedules.length === 0) return null;
                   const today = new Date();
                   today.setHours(0, 0, 0, 0);
                   return bazaarSchedules.find(s => {
                     const from = new Date(s.fromDate);
                     from.setHours(0,0,0,0);
                     const to = new Date(s.toDate);
                     to.setHours(23,59,59,999);
                     return today >= from && today <= to && s.status === 'Approved';
                   });
                 };
                 const todayBazaar = getTodayBazaarInCharge();

                 if (todayBazaar) {
                   return (
                     <div className="space-y-3">
                       <div className="flex items-center gap-3 bg-rose-50/50 p-3.5 rounded-2xl border border-rose-100/50">
                         <div className="w-10 h-10 rounded-xl bg-rose-100 text-rose-750 flex items-center justify-center font-bold flex-shrink-0">
                           {(todayBazaar.userId?.name?.charAt(0) || 'U').toUpperCase()}
                         </div>
                         <div>
                           <p className="font-extrabold text-sm text-gray-900 capitalize">{todayBazaar.userId?.name}</p>
                           <p className="text-[10px] font-bold text-gray-400">মেস মেম্বার (আজকের বাজার কারিগর)</p>
                         </div>
                       </div>
                       
                       {/* Checklist suggestions */}
                       <div className="bg-gray-50/80 p-3.5 rounded-2xl space-y-2">
                         <p className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">বাজারের চেকলিস্ট (Suggestions):</p>
                         <div className="grid grid-cols-2 gap-2 text-[10px] font-bold text-gray-600">
                           <label className="flex items-center gap-1.5 cursor-pointer">
                             <input type="checkbox" defaultChecked className="rounded border-gray-300 text-rose-600 focus:ring-rose-500" />
                             <span>চাল ও তেল</span>
                           </label>
                           <label className="flex items-center gap-1.5 cursor-pointer">
                             <input type="checkbox" className="rounded border-gray-300 text-rose-600 focus:ring-rose-500" />
                             <span>মাছ / মাংস</span>
                           </label>
                           <label className="flex items-center gap-1.5 cursor-pointer">
                             <input type="checkbox" className="rounded border-gray-300 text-rose-600 focus:ring-rose-500" />
                             <span>তরকারি ও সবজি</span>
                           </label>
                           <label className="flex items-center gap-1.5 cursor-pointer">
                             <input type="checkbox" className="rounded border-gray-300 text-rose-600 focus:ring-rose-500" />
                             <span>মশলা ও পেঁয়াজ</span>
                           </label>
                         </div>
                       </div>
                     </div>
                   );
                 } else {
                   return (
                     <div className="text-center py-6 text-gray-400 text-xs font-bold bg-gray-50 rounded-2xl border border-gray-100/50">
                       আজকে বাজার করার জন্য কারো দায়িত্ব নেই।
                     </div>
                   );
                 }
               })()}
             </div>
          </div>





           {/* Leaderboard Achievements Widget */}
          <div suppressHydrationWarning className="bg-white rounded-3xl p-6 shadow-[0_8px_30px_rgb(0,0,0,0.03)] flex flex-col relative overflow-hidden">
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
                      ? leaderboard.negativeList.map(m => m.name?.split(' ')[0] || 'ইউজার').join(', ') 
                      : 'সবাই প্লাস ব্যালেন্সে!'}
                  </p>
                </div>
              </div>
            </div>
          </div>          {/* Live Mess Update Feed */}
          {notifications && notifications.length > 0 && (
            <div suppressHydrationWarning className="bg-white rounded-3xl p-6 shadow-[0_8px_30px_rgb(0,0,0,0.03)] border border-gray-100/50">
              <h3 className="font-extrabold text-gray-955 text-base mb-4 flex items-center gap-2">
                <Activity className="w-5 h-5 text-indigo-500" />
                মেস ফিড (Live Updates)
              </h3>
              
              <div className="space-y-4 max-h-[250px] overflow-y-auto pr-1">
                {notifications.slice(0, 5).map((notif) => (
                  <div key={notif._id} className="relative pl-6 border-l border-gray-100 pb-1.5 last:pb-0">
                    <div className="absolute left-[-5px] top-1.5 w-2.5 h-2.5 bg-indigo-500 rounded-full border border-white shadow-sm animate-pulse" />
                    <div className="text-xs font-bold text-gray-800">
                      <p className="text-[9px] text-gray-400 font-semibold">{formatSafeDate(notif.createdAt)}</p>
                      <p className="font-extrabold text-gray-900 mt-0.5 capitalize">{notif.title}</p>
                      <p className="text-[10px] text-gray-500 font-medium mt-1 leading-relaxed">{notif.message}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Emergency Contacts & Helpdesk */}
          <div suppressHydrationWarning className="bg-white rounded-3xl p-6 shadow-[0_8px_30px_rgb(0,0,0,0.03)] border border-gray-100/50">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-extrabold text-gray-955 text-base flex items-center gap-2">
                <Phone className="w-5 h-5 text-indigo-500" />
                মেস হেল্পডেস্ক ও জরুরি কন্টাক্টস
              </h3>
              {isManagerOrAdmin && (
                <button
                  onClick={() => {
                    setSelectedContact(null);
                    setContactDesignation('');
                    setContactName('');
                    setContactPhone('');
                    setIsEditingContact(true);
                  }}
                  className="px-2.5 py-1 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-[10px] font-extrabold flex items-center gap-1 transition-all shadow-sm"
                >
                  <Plus className="w-3.5 h-3.5" /> যোগ করুন
                </button>
              )}
            </div>
            
            <div className="space-y-3.5 text-xs font-bold">
              {contacts.length === 0 ? (
                <p className="text-gray-400 text-center py-4">কোনো জরুরি কন্টাক্ট পাওয়া যায়নি</p>
              ) : (
                contacts.map((contact: any) => (
                  <div key={contact._id} className="flex items-center justify-between p-3 bg-gray-50/50 border border-gray-100 rounded-2xl hover:bg-gray-50 transition-all group">
                    <div>
                      <p className="text-[9px] text-gray-400 font-bold uppercase tracking-wider">{contact.designation}</p>
                      <p className="text-gray-900 font-extrabold text-sm mt-0.5 capitalize">{contact.name}</p>
                    </div>
                    <div className="flex gap-2 items-center">
                      <a href={`tel:${contact.phone}`} className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center hover:bg-indigo-100 transition-colors">
                        <Phone className="w-4 h-4" />
                      </a>
                      <button 
                        onClick={() => {
                          navigator.clipboard.writeText(contact.phone);
                          toast.success("নম্বর কপি হয়েছে!");
                        }} 
                        className="w-8 h-8 rounded-lg bg-gray-100 text-gray-600 flex items-center justify-center hover:bg-gray-200 transition-colors"
                      >
                        <Copy className="w-4 h-4" />
                      </button>
                      {isManagerOrAdmin && (
                        <>
                          <button
                            onClick={() => handleEditContactClick(contact)}
                            className="w-8 h-8 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-600 flex items-center justify-center transition-colors"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDeleteContactClick(contact._id)}
                            className="w-8 h-8 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-600 flex items-center justify-center transition-colors"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                ))
              )}

              <div className="p-3.5 bg-amber-50 text-amber-900 border border-amber-100/50 rounded-2xl text-[11px] font-semibold leading-relaxed flex items-start gap-2.5">
                <Info className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-extrabold text-amber-955 mb-0.5">গুরুত্বপূর্ণ নোটিফিকেশন নিয়ম:</h4>
                  <p className="opacity-90 text-[10px]">প্রতিদিনের মিল অফ/অন করার সর্বশেষ সময় রাত ১০:০০ টা। বাজার শিডিউল অনুযায়ী দায়িত্বপ্রাপ্ত বাজারকারীকে সকাল ৮:০০ টার মধ্যে বাজারে পৌঁছানোর অনুরোধ করা হচ্ছে।</p>
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
         <div className="flex flex-col sm:flex-row gap-4 items-center justify-between bg-white p-4 rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.03)]">
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
         
         <div suppressHydrationWarning className="bg-white rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.03)] overflow-hidden">
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
                             {(member.name?.charAt(0) || 'U').toUpperCase()}
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

      {/* Low Balance Warning Popup Modal */}
      {showBalanceModal && myStats && myStats.balance <= 0 && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white rounded-[2.5rem] max-w-md w-full p-6 md:p-8 shadow-2xl relative overflow-hidden animate-scaleUp border border-gray-100">
            <div className="absolute top-0 right-0 w-32 h-32 bg-rose-50/50 rounded-bl-full -mr-4 -mt-4 -z-10"></div>
            
            <div className="flex flex-col items-center text-center space-y-5">
              <div className="w-16 h-16 bg-rose-50 rounded-2xl flex items-center justify-center text-rose-600 shadow-md shadow-rose-100 animate-bounce">
                <AlertCircle className="w-8 h-8" />
              </div>

              <div className="space-y-2">
                <h3 className="text-xl font-black text-gray-900 tracking-tight">আপনার ব্যালেন্স শেষ বা ঋণাত্মক!</h3>
                <p className="text-gray-500 text-xs font-semibold px-2 leading-relaxed">
                  মেসের হিসাব সচল রাখতে এবং আপনার মিল নিশ্চিত করতে অ্যাকাউন্টে দ্রুত ব্যালেন্স যুক্ত করুন।
                </p>
              </div>

              <div className="w-full bg-rose-50/40 border border-rose-100/50 rounded-2xl p-4 flex justify-between items-center text-sm font-bold">
                <span className="text-gray-500">আপনার বর্তমান ব্যালেন্স:</span>
                <span className="text-rose-600 text-base font-black">{myStats.balance.toFixed(0)} ৳</span>
              </div>

              <div className="flex flex-col w-full gap-2.5 pt-3">
                <button
                  onClick={() => {
                    setShowBalanceModal(false);
                    router.push('/deposit');
                  }}
                  className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold transition-all text-sm shadow-md shadow-indigo-150"
                >
                  টাকা জমা দিন (Deposit Now)
                </button>
                <button
                  onClick={() => {
                    sessionStorage.setItem('balanceWarningDismissed', 'true');
                    setShowBalanceModal(false);
                  }}
                  className="w-full py-3 bg-gray-50 hover:bg-gray-100 text-gray-600 rounded-xl font-bold transition-all text-sm"
                >
                  পরে করব (Later)
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Live Notification Popup Modal */}
      {popupNotification && (
        <div suppressHydrationWarning className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-md transition-all duration-300 animate-fadeIn">
          <div className="bg-white/90 backdrop-blur-lg rounded-3xl p-6 max-w-sm w-full border border-indigo-100 shadow-[0_20px_50px_rgba(79,70,229,0.15)] relative overflow-hidden animate-slideUp">
            <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-rose-500 via-indigo-500 to-emerald-500 animate-pulse" />
            
            <div className="flex flex-col items-center text-center space-y-4 pt-2">
              <div className="w-12 h-12 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center shadow-lg shadow-indigo-100/50 animate-bounce">
                <Bell className="w-6 h-6" />
              </div>
              
              <div>
                <span className="text-[9px] font-black text-indigo-600 bg-indigo-50 px-2.5 py-0.5 rounded-full uppercase tracking-wider animate-pulse">নতুন নোটিফিকেশন</span>
                <h3 className="text-base font-extrabold text-gray-955 mt-2.5 capitalize">{popupNotification.title}</h3>
                <p className="text-xs text-gray-500 font-bold mt-2 leading-relaxed">{popupNotification.message}</p>
              </div>

              <div className="w-full pt-2">
                <button
                  onClick={() => setPopupNotification(null)}
                  className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold transition-all text-xs shadow-md shadow-indigo-100 hover:shadow-lg hover:shadow-indigo-200"
                >
                  ঠিক আছে, বন্ধ করুন
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Add/Edit Contact Modal */}
      {isEditingContact && (
        <div suppressHydrationWarning className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-md transition-all duration-300 animate-fadeIn">
          <div className="bg-white rounded-3xl p-6 max-w-sm w-full border border-gray-100 shadow-[0_20px_50px_rgba(0,0,0,0.1)] relative overflow-hidden animate-slideUp">
            <button 
              onClick={() => setIsEditingContact(false)}
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            <h3 className="text-base font-extrabold text-gray-955 mb-4 flex items-center gap-2">
              <Phone className="w-5 h-5 text-indigo-500" />
              {selectedContact ? 'কন্টাক্ট এডিট করুন' : 'নতুন কন্টাক্ট যোগ করুন'}
            </h3>

            <form onSubmit={handleContactSubmit} className="space-y-4 text-xs font-bold">
              <div className="space-y-1">
                <label className="text-[10px] font-extrabold text-gray-500 uppercase tracking-wider">পদবী / Designation</label>
                <input 
                  type="text"
                  required
                  value={contactDesignation}
                  onChange={(e) => setContactDesignation(e.target.value)}
                  placeholder="যেমন: মেস বাবুর্চি"
                  className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-100 rounded-xl text-xs font-bold text-gray-900 focus:outline-none focus:border-indigo-200"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-extrabold text-gray-500 uppercase tracking-wider">নাম / Name</label>
                <input 
                  type="text"
                  required
                  value={contactName}
                  onChange={(e) => setContactName(e.target.value)}
                  placeholder="যেমন: বাবুল ভাই"
                  className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-100 rounded-xl text-xs font-bold text-gray-900 focus:outline-none focus:border-indigo-200"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-extrabold text-gray-500 uppercase tracking-wider">ফোন নম্বর / Phone Number</label>
                <input 
                  type="text"
                  required
                  value={contactPhone}
                  onChange={(e) => setContactPhone(e.target.value)}
                  placeholder="যেমন: +8801800000000"
                  className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-100 rounded-xl text-xs font-bold text-gray-900 focus:outline-none focus:border-indigo-200"
                />
              </div>

              <div className="pt-2 flex gap-3">
                <button
                  type="button"
                  onClick={() => setIsEditingContact(false)}
                  className="w-1/2 py-3 bg-gray-50 hover:bg-gray-100 text-gray-600 rounded-xl font-bold transition-all text-xs"
                >
                  বাতিল করুন
                </button>
                <button
                  type="submit"
                  disabled={contactSubmitLoading}
                  className="w-1/2 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold transition-all text-xs disabled:opacity-50 shadow-md shadow-indigo-100"
                >
                  {contactSubmitLoading ? 'সংরক্ষণ হচ্ছে...' : 'সংরক্ষণ করুন'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Menu Ratings Detail Modal for Admins */}
      {showRatingsDetailModal && (
        <div suppressHydrationWarning className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-md transition-all duration-300 animate-fadeIn">
          <div className="bg-white rounded-3xl p-6 max-w-md w-full border border-gray-100 shadow-[0_20px_50px_rgba(0,0,0,0.1)] relative overflow-hidden animate-slideUp">
            <button 
              onClick={() => setShowRatingsDetailModal(false)}
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            <h3 className="text-base font-extrabold text-gray-955 mb-4 flex items-center gap-2">
              <ChefHat className="w-5 h-5 text-orange-500" />
              আজকের খাবারের রিভিউ ডিটেইলস
            </h3>

            <div className="space-y-4 max-h-[350px] overflow-y-auto pr-1">
              <div className="grid grid-cols-3 gap-2 bg-gray-50 p-3 rounded-2xl text-center text-[10px] font-extrabold text-gray-500 uppercase tracking-wider">
                <div>🍳 সকাল (গড়: {menuAverages.breakfast || 0}★)</div>
                <div>🍛 দুপুর (গড়: {menuAverages.lunch || 0}★)</div>
                <div>🍲 রাত (গড়: {menuAverages.dinner || 0}★)</div>
              </div>

              <div className="space-y-2">
                {allMenuRatings.length === 0 ? (
                  <p className="text-gray-400 text-center py-4">কোনো রিভিউ ডেটা পাওয়া যায়নি</p>
                ) : (
                  allMenuRatings.map((rating: any) => (
                    <div key={rating._id} className="p-3 border border-gray-100 rounded-2xl flex items-center justify-between text-xs font-bold bg-gray-50/20">
                      <div>
                        <p className="text-gray-900 font-extrabold capitalize">{rating.userId?.name || 'অজানা মেম্বার'}</p>
                        <p className="text-[9px] text-gray-400 font-bold uppercase tracking-wider">{rating.userId?.role === 'Super Admin' ? 'সুপার অ্যাডমিন' : rating.userId?.role === 'Manager' ? 'ম্যানেজার' : 'মেম্বার'}</p>
                      </div>
                      
                      <div className="flex gap-3 text-right">
                        <div>
                          <p className="text-[8px] text-gray-400 uppercase">🍳</p>
                          <p className="text-amber-500 font-black">{rating.breakfast > 0 ? `${rating.breakfast}★` : '-'}</p>
                        </div>
                        <div>
                          <p className="text-[8px] text-gray-400 uppercase">🍛</p>
                          <p className="text-amber-500 font-black">{rating.lunch > 0 ? `${rating.lunch}★` : '-'}</p>
                        </div>
                        <div>
                          <p className="text-[8px] text-gray-400 uppercase">🍲</p>
                          <p className="text-amber-500 font-black">{rating.dinner > 0 ? `${rating.dinner}★` : '-'}</p>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            <div className="pt-4 border-t border-gray-150 mt-4">
              <button
                onClick={() => setShowRatingsDetailModal(false)}
                className="w-full py-3 bg-gray-50 hover:bg-gray-100 text-gray-600 rounded-xl font-bold transition-all text-xs"
              >
                বন্ধ করুন
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
