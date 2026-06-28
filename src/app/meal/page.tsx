"use client";

import { useState, useEffect } from 'react';
import { useAuth, MongoUser } from '@/context/AuthContext';
import { Utensils, Loader2, Save } from 'lucide-react';
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

  const handleMealChange = (userId: string, type: 'breakfast' | 'lunch' | 'dinner', value: string) => {
    const numValue = value === '' ? 0 : Number(value);
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

  if (mongoUser?.role !== 'Super Admin' && mongoUser?.role !== 'Manager') {
    return <div className="p-6 text-center text-red-500">You do not have permission to access this page.</div>;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeMonth) {
      toast.error('কোনো চলমান মাস পাওয়া যায়নি। আগে নতুন মাস শুরু করুন।');
      return;
    }

    setLoading(true);

    try {
      // Prepare bulk data
      const bulkData = members.map(m => {
        const data = mealsData[m._id];
        return {
          userId: m._id,
          breakfast: data.breakfast,
          lunch: data.lunch,
          dinner: data.dinner,
          mealCount: data.breakfast + data.lunch + data.dinner
        };
      }).filter(d => d.mealCount > 0); // Only submit for members who have meals > 0

      if (bulkData.length === 0) {
        toast.error('অনুগ্রহ করে অন্তত একজনের মিল ইনপুট দিন।');
        setLoading(false);
        return;
      }

      const res = await addBulkMeals(activeMonth._id, new Date(date), bulkData);
      
      if (res.success) {
        toast.success('সকলের মিল সফলভাবে যুক্ত হয়েছে এবং গুগল শিটে আপডেট হয়েছে!');
        
        // Reset all inputs back to 0
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
    return <div className="flex justify-center p-10"><Loader2 className="w-8 h-8 animate-spin text-orange-500" /></div>;
  }

  return (
    <div className="w-full mt-4 space-y-6">
      <div className="bg-white rounded-3xl p-8 shadow-sm border border-gray-100 flex items-center gap-4">
        <div className="w-14 h-14 bg-orange-50 text-orange-500 rounded-2xl flex items-center justify-center">
          <Utensils className="w-7 h-7" />
        </div>
        <div>
          <h2 className="text-2xl font-bold text-gray-900">মিল যুক্ত করুন</h2>
          <p className="text-gray-500 mt-1">চলমান মাস: <span className="font-bold text-gray-800">{activeMonth?.name || 'কোনো মাস শুরু হয়নি'}</span></p>
        </div>
      </div>
      
      <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
        <form onSubmit={handleSubmit}>
          <div className="p-6 border-b border-gray-100 bg-gray-50/50 flex flex-wrap items-center justify-between gap-4">
            <h3 className="font-bold text-gray-800">সব মেম্বারের আজকের মিল</h3>
            <div className="flex items-center gap-3">
              <label className="text-sm font-bold text-gray-700">তারিখ:</label>
              <input
                type="date"
                required
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="px-4 py-2 rounded-xl border border-gray-200 focus:ring-2 focus:ring-orange-500 outline-none font-medium"
              />
            </div>
          </div>
          
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-[600px]">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50">
                  <th className="p-4 text-sm font-bold text-gray-600">মেম্বার</th>
                  <th className="p-4 text-sm font-bold text-gray-600 text-center">সকালের মিল</th>
                  <th className="p-4 text-sm font-bold text-gray-600 text-center">দুপুরের মিল</th>
                  <th className="p-4 text-sm font-bold text-gray-600 text-center">রাতের মিল</th>
                  <th className="p-4 text-sm font-bold text-gray-600 text-center">সর্বমোট</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {members.map(m => (
                  <tr key={m._id} className="hover:bg-gray-50 transition-colors">
                    <td className="p-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-indigo-50 text-indigo-600 rounded-full flex items-center justify-center font-bold">
                          {m.name.charAt(0).toUpperCase()}
                        </div>
                        <span className="font-bold text-gray-900">{m.name}</span>
                      </div>
                    </td>
                    <td className="p-4 text-center">
                      <input
                        type="number"
                        min="0"
                        step="0.5"
                        value={mealsData[m._id]?.breakfast || ''}
                        onChange={(e) => handleMealChange(m._id, 'breakfast', e.target.value)}
                        className="w-20 px-3 py-2 text-center rounded-xl border border-gray-200 focus:border-orange-500 focus:ring-2 focus:ring-orange-200 outline-none transition-all font-bold text-gray-800"
                        placeholder="0"
                      />
                    </td>
                    <td className="p-4 text-center">
                      <input
                        type="number"
                        min="0"
                        step="0.5"
                        value={mealsData[m._id]?.lunch || ''}
                        onChange={(e) => handleMealChange(m._id, 'lunch', e.target.value)}
                        className="w-20 px-3 py-2 text-center rounded-xl border border-gray-200 focus:border-orange-500 focus:ring-2 focus:ring-orange-200 outline-none transition-all font-bold text-gray-800"
                        placeholder="0"
                      />
                    </td>
                    <td className="p-4 text-center">
                      <input
                        type="number"
                        min="0"
                        step="0.5"
                        value={mealsData[m._id]?.dinner || ''}
                        onChange={(e) => handleMealChange(m._id, 'dinner', e.target.value)}
                        className="w-20 px-3 py-2 text-center rounded-xl border border-gray-200 focus:border-orange-500 focus:ring-2 focus:ring-orange-200 outline-none transition-all font-bold text-gray-800"
                        placeholder="0"
                      />
                    </td>
                    <td className="p-4 text-center">
                      <span className="inline-block px-4 py-1.5 bg-orange-100 text-orange-700 font-bold rounded-full">
                        {calculateTotal(m._id)}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          
          <div className="p-6 border-t border-gray-100 bg-gray-50/50 flex justify-end">
            <button
              type="submit"
              disabled={loading || !activeMonth}
              className="flex items-center gap-2 px-8 py-3.5 bg-orange-500 hover:bg-orange-600 text-white rounded-xl font-bold transition-colors shadow-md shadow-orange-200 disabled:opacity-70"
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
