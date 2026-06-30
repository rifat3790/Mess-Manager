"use client";

import { useState, useEffect } from 'react';
import { useAuth, MongoUser } from '@/context/AuthContext';
import { Utensils, Loader2, Save, Sparkles, Check, RefreshCw, Plus, Minus } from 'lucide-react';
import { getActiveMonth, getMembers, addBulkMeals } from '@/app/actions/dataActions';
import { toast } from 'react-hot-toast';

export default function MealPage() {
  const { mongoUser } = useAuth();
  const [members, setMembers] = useState<MongoUser[]>([]);
  const [activeMonth, setActiveMonth] = useState<any>(null);
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  
  // State for meals: { [userId]: { breakfast: number, lunch: number, dinner: number } }
  const [mealsData, setMealsData] = useState<Record<string, { breakfast: number, lunch: number, dinner: number }>>({});
  
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);

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
        
        // Initialize meals data state
        const initialMeals: any = {};
        membersRes.users.forEach((m: any) => {
          initialMeals[m._id] = { breakfast: 0, lunch: 0, dinner: 0 };
        });
        setMealsData(initialMeals);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setFetching(false);
    }
  };

  const handleMealChange = (userId: string, type: 'breakfast' | 'lunch' | 'dinner', value: number) => {
    const numValue = Math.max(0, value);
    setMealsData(prev => ({
      ...prev,
      [userId]: {
        ...prev[userId],
        [type]: numValue
      }
    }));
  };

  const calculateTotal = (userId: string) => {
    const data = mealsData[userId];
    if (!data) return 0;
    return (data.breakfast + data.lunch + data.dinner).toFixed(1);
  };

  const calculateAllMembersTotal = () => {
    let total = 0;
    Object.values(mealsData).forEach(d => {
      total += (d.breakfast || 0) + (d.lunch || 0) + (d.dinner || 0);
    });
    return total.toFixed(1);
  };

  const applyBulkPreset = (breakfast: number, lunch: number, dinner: number) => {
    const updated: any = {};
    members.forEach(m => {
      updated[m._id] = { breakfast, lunch, dinner };
    });
    setMealsData(updated);
    toast.success("সবার জন্য মিল প্রিসেট সফলভাবে সেট করা হয়েছে!");
  };

  const setIndividualPreset = (userId: string, breakfast: number, lunch: number, dinner: number) => {
    setMealsData(prev => ({
      ...prev,
      [userId]: { breakfast, lunch, dinner }
    }));
  };

  const resetAll = () => {
    const updated: any = {};
    members.forEach(m => {
      updated[m._id] = { breakfast: 0, lunch: 0, dinner: 0 };
    });
    setMealsData(updated);
    toast.success("সব রিসেট করা হয়েছে।");
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

    const bulkData = members.map(m => {
      const data = mealsData[m._id] || { breakfast: 0, lunch: 0, dinner: 0 };
      return {
        userId: m._id,
        breakfast: data.breakfast,
        lunch: data.lunch,
        dinner: data.dinner,
        mealCount: data.breakfast + data.lunch + data.dinner
      };
    }).filter(d => d.mealCount > 0);

    if (bulkData.length === 0) {
      toast.error('অনুগ্রহ করে অন্তত একজনের মিল ইনপুট দিন।');
      return;
    }

    setLoading(true);

    try {
      const res = await addBulkMeals(activeMonth._id, new Date(date), bulkData);
      
      if (res.success) {
        toast.success('সকলের মিল সফলভাবে যুক্ত হয়েছে এবং গুগল শিটে আপডেট হয়েছে!');
        const resetMeals: any = {};
        members.forEach(m => { resetMeals[m._id] = { breakfast: 0, lunch: 0, dinner: 0 }; });
        setMealsData(resetMeals);
      } else {
        toast.error(res.error || 'মিল যুক্ত করতে সমস্যা হয়েছে।');
      }
    } catch (err: any) {
      toast.error(err.message || 'Error occurred');
    } finally {
      setLoading(false);
    }
  };

  if (fetching) {
    return (
      <div className="flex flex-col justify-center items-center min-h-[60vh]">
        <Loader2 className="w-12 h-12 animate-spin text-orange-500 mb-4" />
        <p className="text-gray-500 font-medium">মেম্বার তালিকা লোড হচ্ছে...</p>
      </div>
    );
  }

  return (
    <div suppressHydrationWarning className="w-full mt-2 space-y-6 pb-16">
      
      {/* Header and Live Total Card */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-2 bg-gradient-to-r from-orange-50 to-amber-50 rounded-3xl p-6 border border-orange-100 flex items-center gap-5 shadow-[0_8px_30px_rgb(249,115,22,0.02)]">
          <div className="w-14 h-14 bg-gradient-to-br from-orange-500 to-amber-500 text-white rounded-2xl flex items-center justify-center shadow-md shadow-orange-200">
            <Utensils className="w-7 h-7" />
          </div>
          <div>
            <h2 className="text-2xl font-black text-gray-900 tracking-tight">মিল যুক্ত করুন (অ্যাডমিন প্যানেল)</h2>
            <p className="text-gray-500 mt-0.5 text-xs font-semibold">
              চলমান মাস: <span className="text-orange-600 bg-orange-100/50 px-2 py-0.5 rounded font-black">{activeMonth?.name || 'কোনো মাস শুরু হয়নি'}</span>
            </p>
          </div>
        </div>

        {/* Live Total Meals Counter */}
        <div className="bg-gradient-to-br from-orange-500 to-amber-600 rounded-3xl p-6 text-white shadow-lg shadow-orange-200/50 flex flex-col justify-between relative overflow-hidden group">
          <div className="absolute -top-10 -right-10 w-24 h-24 bg-white/10 rounded-full blur-xl group-hover:scale-150 transition-all duration-700"></div>
          <p className="text-xs font-black tracking-wider uppercase opacity-85">ইনপুটকৃত সর্বমোট মিল</p>
          <div className="flex items-baseline gap-2 mt-2">
            <span className="text-4xl font-black tracking-tight">{calculateAllMembersTotal()}</span>
            <span className="text-sm font-bold opacity-90">টি মিল</span>
          </div>
        </div>
      </div>

      {/* Bulk Presets Options */}
      <div className="bg-white border border-gray-150 shadow-sm rounded-3xl p-6">
        <h3 className="font-extrabold text-gray-900 text-sm mb-4 flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-orange-500" />
          এক ক্লিকে সবার মিল সেট করুন (কুইক প্রিসেট)
        </h3>
        
        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            onClick={() => applyBulkPreset(0.5, 1, 1)}
            className="px-4 py-2.5 bg-orange-50 hover:bg-orange-100 text-orange-700 border border-orange-150 text-xs font-bold rounded-xl transition-all"
          >
            🍳 সবাই ২.৫ মিল (Breakfast: 0.5, Lunch: 1, Dinner: 1)
          </button>
          <button
            type="button"
            onClick={() => applyBulkPreset(0, 1, 1)}
            className="px-4 py-2.5 bg-orange-50 hover:bg-orange-100 text-orange-700 border border-orange-150 text-xs font-bold rounded-xl transition-all"
          >
            🍛 সবাই ২.০ মিল (Lunch: 1, Dinner: 1)
          </button>
          <button
            type="button"
            onClick={() => applyBulkPreset(0, 1, 0)}
            className="px-4 py-2.5 bg-orange-50 hover:bg-orange-100 text-orange-700 border border-orange-150 text-xs font-bold rounded-xl transition-all"
          >
            🍚 সবাই ১.০ মিল (Lunch: 1 only)
          </button>
          <button
            type="button"
            onClick={() => applyBulkPreset(0.5, 0, 0)}
            className="px-4 py-2.5 bg-orange-50 hover:bg-orange-100 text-orange-700 border border-orange-150 text-xs font-bold rounded-xl transition-all"
          >
            🥚 সবাই ০.৫ মিল (Breakfast only)
          </button>
          <button
            type="button"
            onClick={resetAll}
            className="px-4 py-2.5 bg-gray-50 hover:bg-gray-100 text-gray-700 border border-gray-200 text-xs font-bold rounded-xl transition-all flex items-center gap-1.5 ml-auto"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            সবাই ০ করুন (রিসেট)
          </button>
        </div>
      </div>

      {/* Main Form Table */}
      <div className="bg-white rounded-3xl shadow-sm border border-gray-150 overflow-hidden">
        <form onSubmit={handleSubmit}>
          <div className="p-6 border-b border-gray-100 bg-gray-50/50 flex flex-wrap items-center justify-between gap-4">
            <h3 className="font-extrabold text-gray-900 text-base">সব মেম্বারের মিল এন্ট্রি</h3>
            <div className="flex items-center gap-3">
              <label className="text-xs font-bold text-gray-500 uppercase tracking-wide">তারিখ নির্বাচন:</label>
              <input
                type="date"
                required
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="px-4 py-2 rounded-xl border border-gray-200 focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 outline-none font-bold text-sm text-gray-800"
              />
            </div>
          </div>
          
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-[700px]">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50/20">
                  <th className="px-6 py-4.5 text-xs font-bold text-gray-400 uppercase tracking-wider">মেম্বার</th>
                  <th className="px-6 py-4.5 text-xs font-bold text-gray-400 uppercase tracking-wider text-center">সকালের মিল (Eggs)</th>
                  <th className="px-6 py-4.5 text-xs font-bold text-gray-400 uppercase tracking-wider text-center">দুপুরের মিল (Rice)</th>
                  <th className="px-6 py-4.5 text-xs font-bold text-gray-400 uppercase tracking-wider text-center">রাতের মিল (Curry)</th>
                  <th className="px-6 py-4.5 text-xs font-bold text-gray-400 uppercase tracking-wider text-center">কুইক সিলেক্ট</th>
                  <th className="px-6 py-4.5 text-xs font-bold text-gray-400 uppercase tracking-wider text-right">সর্বমোট</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {members.map((m, idx) => (
                  <tr key={m._id} className="hover:bg-orange-50/10 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-white font-bold text-sm shadow-sm ${
                          idx % 4 === 0 ? 'bg-orange-500' : idx % 4 === 1 ? 'bg-blue-500' : idx % 4 === 2 ? 'bg-indigo-500' : 'bg-emerald-500'
                        }`}>
                          {m.name.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <span className="font-bold text-gray-900 capitalize text-sm">{m.name}</span>
                          <p className="text-[10px] font-bold text-gray-400 uppercase mt-0.5">{m.role}</p>
                        </div>
                      </div>
                    </td>
                    
                    {/* Breakfast Input +/- */}
                    <td className="px-6 py-4 text-center">
                      <div className="flex items-center justify-center gap-2">
                        <button
                          type="button"
                          onClick={() => handleMealChange(m._id, 'breakfast', (mealsData[m._id]?.breakfast || 0) - 0.5)}
                          className="w-7 h-7 bg-gray-50 hover:bg-gray-100 border border-gray-200 rounded-lg flex items-center justify-center text-gray-500 transition-colors"
                        >
                          <Minus className="w-3.5 h-3.5" />
                        </button>
                        <span className="w-10 text-center font-black text-gray-800 text-sm">
                          {(mealsData[m._id]?.breakfast || 0).toFixed(1)}
                        </span>
                        <button
                          type="button"
                          onClick={() => handleMealChange(m._id, 'breakfast', (mealsData[m._id]?.breakfast || 0) + 0.5)}
                          className="w-7 h-7 bg-gray-50 hover:bg-gray-100 border border-gray-200 rounded-lg flex items-center justify-center text-gray-500 transition-colors"
                        >
                          <Plus className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>

                    {/* Lunch Input +/- */}
                    <td className="px-6 py-4 text-center">
                      <div className="flex items-center justify-center gap-2">
                        <button
                          type="button"
                          onClick={() => handleMealChange(m._id, 'lunch', (mealsData[m._id]?.lunch || 0) - 0.5)}
                          className="w-7 h-7 bg-gray-50 hover:bg-gray-100 border border-gray-200 rounded-lg flex items-center justify-center text-gray-500 transition-colors"
                        >
                          <Minus className="w-3.5 h-3.5" />
                        </button>
                        <span className="w-10 text-center font-black text-gray-800 text-sm">
                          {(mealsData[m._id]?.lunch || 0).toFixed(1)}
                        </span>
                        <button
                          type="button"
                          onClick={() => handleMealChange(m._id, 'lunch', (mealsData[m._id]?.lunch || 0) + 0.5)}
                          className="w-7 h-7 bg-gray-50 hover:bg-gray-100 border border-gray-200 rounded-lg flex items-center justify-center text-gray-500 transition-colors"
                        >
                          <Plus className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>

                    {/* Dinner Input +/- */}
                    <td className="px-6 py-4 text-center">
                      <div className="flex items-center justify-center gap-2">
                        <button
                          type="button"
                          onClick={() => handleMealChange(m._id, 'dinner', (mealsData[m._id]?.dinner || 0) - 0.5)}
                          className="w-7 h-7 bg-gray-50 hover:bg-gray-100 border border-gray-200 rounded-lg flex items-center justify-center text-gray-500 transition-colors"
                        >
                          <Minus className="w-3.5 h-3.5" />
                        </button>
                        <span className="w-10 text-center font-black text-gray-800 text-sm">
                          {(mealsData[m._id]?.dinner || 0).toFixed(1)}
                        </span>
                        <button
                          type="button"
                          onClick={() => handleMealChange(m._id, 'dinner', (mealsData[m._id]?.dinner || 0) + 0.5)}
                          className="w-7 h-7 bg-gray-50 hover:bg-gray-100 border border-gray-200 rounded-lg flex items-center justify-center text-gray-500 transition-colors"
                        >
                          <Plus className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>

                    {/* Row-Level Presets */}
                    <td className="px-6 py-4 text-center">
                      <div className="flex items-center justify-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => setIndividualPreset(m._id, 0, 1, 0)}
                          className="px-2 py-1 bg-gray-100 hover:bg-orange-100 hover:text-orange-700 text-gray-600 rounded-md text-[10px] font-black transition-colors"
                        >
                          ১.০
                        </button>
                        <button
                          type="button"
                          onClick={() => setIndividualPreset(m._id, 0, 1, 1)}
                          className="px-2 py-1 bg-gray-100 hover:bg-orange-100 hover:text-orange-700 text-gray-600 rounded-md text-[10px] font-black transition-colors"
                        >
                          ২.০
                        </button>
                        <button
                          type="button"
                          onClick={() => setIndividualPreset(m._id, 0.5, 1, 1)}
                          className="px-2 py-1 bg-gray-100 hover:bg-orange-100 hover:text-orange-700 text-gray-600 rounded-md text-[10px] font-black transition-colors"
                        >
                          ২.৫
                        </button>
                        <button
                          type="button"
                          onClick={() => setIndividualPreset(m._id, 0, 0, 0)}
                          className="px-2 py-1 bg-gray-100 hover:bg-rose-100 hover:text-rose-600 text-gray-600 rounded-md text-[10px] font-black transition-colors"
                        >
                          ০
                        </button>
                      </div>
                    </td>

                    {/* Total column */}
                    <td className="px-6 py-4 text-right">
                      <span className="inline-block px-3.5 py-1.5 bg-orange-50 text-orange-600 font-extrabold rounded-xl border border-orange-100 text-xs shadow-sm">
                        {calculateTotal(m._id)}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          
          {/* Submit panel */}
          <div className="p-6 border-t border-gray-100 bg-gray-50/50 flex justify-end">
            <button
              type="submit"
              disabled={loading || !activeMonth}
              className="flex items-center gap-2 px-8 py-3.5 bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white rounded-2xl font-bold transition-all shadow-md shadow-orange-200 disabled:opacity-70 text-sm"
            >
              {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
              {loading ? 'সেভ হচ্ছে...' : 'সকলের মিল সেভ করুন'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
