"use client";

import { useAuth } from '@/context/AuthContext';
import { Calendar, Loader2, CheckCircle2, Clock } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getAllMonths, setActiveMonth } from '@/app/actions/adminActions';

export default function ManageMonthPage() {
  const { mongoUser, loading: authLoading } = useAuth();
  const router = useRouter();
  
  const [months, setMonths] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  useEffect(() => {
    if (!authLoading && (!mongoUser || (mongoUser.role !== 'Super Admin' && mongoUser.role !== 'Manager'))) {
      router.push('/');
    }
  }, [mongoUser, authLoading, router]);

  useEffect(() => {
    async function fetchMonths() {
      if (!mongoUser?._id) return;
      const res = await getAllMonths(mongoUser._id);
      if (res.success) {
        setMonths(res.months);
      }
      setLoading(false);
    }
    if (mongoUser) {
      fetchMonths();
    }
  }, [mongoUser]);

  const handleActivate = async (id: string) => {
    if (!mongoUser) return;
    setUpdatingId(id);
    const res = await setActiveMonth(id, mongoUser._id);
    if (res.success) {
      setMonths(months.map(m => ({ ...m, isActive: m._id === id })));
      alert('চলমান মাস পরিবর্তন করা হয়েছে!');
    } else {
      alert('সমস্যা হয়েছে: ' + res.error);
    }
    setUpdatingId(null);
  };

  if (authLoading || loading) {
    return (
      <div className="flex justify-center items-center min-h-[60vh]">
        <Loader2 className="w-10 h-10 animate-spin text-blue-500" />
      </div>
    );
  }

  if (!mongoUser || (mongoUser.role !== 'Super Admin' && mongoUser.role !== 'Manager')) return null;

  return (
    <div className="w-full space-y-6 mt-4">
      <div className="bg-white p-8 rounded-3xl shadow-sm border border-gray-100 flex items-center gap-4">
        <div className="w-14 h-14 bg-purple-50 text-purple-600 rounded-2xl flex items-center justify-center">
          <Calendar className="w-7 h-7" />
        </div>
        <div>
          <h2 className="text-2xl font-bold text-gray-900">মাস ম্যানেজমেন্ট</h2>
          <p className="text-gray-500 mt-1">যেকোনো মাসকে চলমান মাস (Active Month) হিসেবে সেট করুন</p>
        </div>
      </div>

      <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="p-6 border-b border-gray-100 bg-gray-50/50">
          <h3 className="font-bold text-gray-800">সকল মাসের তালিকা</h3>
        </div>
        
        <div className="p-2">
          {months.length === 0 ? (
            <p className="p-6 text-center text-gray-500">কোনো মাস পাওয়া যায়নি</p>
          ) : (
            <div className="divide-y divide-gray-100">
              {months.map(month => (
                <div key={month._id} className="p-4 flex items-center justify-between hover:bg-gray-50 transition-colors rounded-xl">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center font-bold">
                      <Calendar className="w-6 h-6" />
                    </div>
                    <div>
                      <p className="font-bold text-gray-900 text-lg">{month.name}</p>
                      <p className="text-sm text-gray-500">তৈরি: {new Date(month.createdAt).toLocaleDateString()}</p>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-4">
                    {month.isActive ? (
                      <span className="flex items-center gap-2 text-emerald-600 bg-emerald-50 px-4 py-2 rounded-xl text-sm font-bold border border-emerald-100">
                        <CheckCircle2 className="w-5 h-5" /> চলমান মাস
                      </span>
                    ) : (
                      <button 
                        onClick={() => handleActivate(month._id)}
                        disabled={updatingId === month._id}
                        className="flex items-center gap-2 text-gray-600 bg-gray-100 hover:bg-gray-200 px-4 py-2 rounded-xl text-sm font-bold transition-colors disabled:opacity-50"
                      >
                        {updatingId === month._id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Clock className="w-4 h-4" />}
                        অ্যাকটিভ করুন
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
