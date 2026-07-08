"use client";

import { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { Settings, Loader2, AlertTriangle, Save, Trash2 } from 'lucide-react';
import { getSettings, updateSettings, deleteEntireMess } from '@/app/actions/settingsActions';
import { useRouter } from 'next/navigation';

export default function SettingsPage() {
  const { mongoUser } = useAuth();
  const router = useRouter();
  
  const [settings, setSettings] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);
  const [message, setMessage] = useState('');
  
  const [deleteConfirm, setDeleteConfirm] = useState('');
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState('');

  const [months, setMonths] = useState<any[]>([]);
  const [activeMonthId, setActiveMonthId] = useState('');

  useEffect(() => {
    if (mongoUser?._id) {
      fetchData(mongoUser._id);
    }
  }, [mongoUser]);

  const fetchData = async (userId: string) => {
    try {
      const res = await getSettings(userId);
      if (res.success) setSettings(res.settings);
      
      const { getAllMonths, getActiveMonth } = await import('@/app/actions/dataActions');
      const monthsRes = await getAllMonths(userId);
      if (monthsRes.success) setMonths(monthsRes.months);
      
      const activeRes = await getActiveMonth(userId);
      if (activeRes.success && activeRes.month) setActiveMonthId(activeRes.month._id);
      
    } catch (err) {
      console.error(err);
    } finally {
      setFetching(false);
    }
  };

  if (fetching || !mongoUser) {
    return <div className="flex justify-center p-10"><Loader2 className="w-8 h-8 animate-spin text-gray-500" /></div>;
  }

  if (mongoUser.role !== 'Super Admin') {
    return <div className="p-6 text-center text-red-500">Only Super Admin can access Settings.</div>;
  }

  const handleToggle = async (key: string, value: any) => {
    if (!mongoUser._id) return;
    setLoading(true);
    setMessage('');
    try {
      const res = await updateSettings({ [key]: value }, mongoUser._id);
      if (res.success) {
        setSettings(res.settings);
        setMessage('সেটিংস আপডেট হয়েছে।');
      }
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
      setTimeout(() => setMessage(''), 3000);
    }
  };

  const handleActiveMonthChange = async (monthId: string) => {
    if (!mongoUser._id) return;
    setLoading(true);
    setMessage('');
    try {
      const { setActiveMonth } = await import('@/app/actions/dataActions');
      const res = await setActiveMonth(monthId, mongoUser._id);
      if (res.success) {
        setActiveMonthId(monthId);
        setMessage('চলমান মাস সফলভাবে পরিবর্তন করা হয়েছে।');
      }
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
      setTimeout(() => setMessage(''), 3000);
    }
  };

  const handleDeleteMess = async () => {
    if (!mongoUser._id) return;
    if (deleteConfirm !== 'DELETE MESS') {
      setDeleteError('অনুগ্রহ করে সঠিক কনফার্মেশন টেক্সট লিখুন (DELETE MESS)');
      return;
    }
    
    if (!confirm('আপনি কি সম্পূর্ণ নিশ্চিত? এই কাজ আর ফেরানো যাবে না। সব মেম্বার, খরচ, মিল, জমা সব ডিলিট হয়ে যাবে!')) return;

    setDeleting(true);
    setDeleteError('');
    
    try {
      const res = await deleteEntireMess(deleteConfirm, mongoUser._id);
      if (res.success) {
        alert('আপনার মেসের সম্পূর্ণ ডেটা ডিলিট করা হয়েছে।');
        window.location.href = '/';
      } else {
        setDeleteError(res.error || 'ডিলিট করতে সমস্যা হয়েছে।');
        setDeleting(false);
      }
    } catch (err: any) {
      setDeleteError(err.message || 'Error occurred');
      setDeleting(false);
    }
  };

  return (
    <div className="w-full mt-4 space-y-8">
      
      {/* Header */}
      <div className="bg-white rounded-3xl p-8 shadow-sm border border-gray-100 flex items-center gap-4">
        <div className="w-14 h-14 bg-gray-100 text-gray-700 rounded-2xl flex items-center justify-center">
          <Settings className="w-7 h-7" />
        </div>
        <div>
          <h2 className="text-2xl font-bold text-gray-900">মেস সেটিংস</h2>
          <p className="text-gray-500 mt-1">সিস্টেম কনফিগারেশন এবং অ্যাডমিন কন্ট্রোল</p>
        </div>
      </div>
      
      {message && <div className="bg-emerald-50 text-emerald-600 p-4 rounded-xl text-sm border border-emerald-100 font-bold">{message}</div>}
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        
        <div className="space-y-8">
          {/* Mess Name Settings */}
          <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-8">
            <h3 className="font-bold text-gray-900 text-xl mb-4">মেসের নাম (Mess Name)</h3>
            <p className="text-sm text-gray-500 mb-4">এই নাম হোমপেজ, সাইডবার ও লগইন পেজে দেখানো হবে।</p>
            <div className="flex items-center gap-4">
              <input 
                type="text" 
                value={settings?.messName || ''} 
                onChange={(e) => setSettings({ ...settings, messName: e.target.value })}
                placeholder="মেসের নাম লিখুন"
                className="flex-1 px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-indigo-500 outline-none transition-all font-medium"
              />
              <button 
                onClick={() => handleToggle('messName', settings.messName)}
                disabled={loading}
                className="px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl flex items-center gap-2 transition-all disabled:opacity-50"
              >
                {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
                সেভ করুন
              </button>
            </div>
          </div>

          {/* Active Month Settings */}
          <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-8">
            <h3 className="font-bold text-gray-900 text-xl mb-4">চলমান মাস (Active Month)</h3>
            <p className="text-sm text-gray-500 mb-4">যেই মাসটি চলমান থাকবে, হোমপেজে এবং অন্যান্য জায়গায় ডিফল্ট ভাবে সেই মাসের ডেটা দেখাবে।</p>
            <div className="flex items-center gap-4">
              <select 
                value={activeMonthId} 
                onChange={(e) => handleActiveMonthChange(e.target.value)}
                disabled={loading}
                className="flex-1 px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-indigo-500 outline-none transition-all font-medium"
              >
                <option value="">-- মাস নির্বাচন করুন --</option>
                {months.map(m => (
                  <option key={m._id} value={m._id}>{m.name}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Toggle Settings */}
          <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-8">
            <h3 className="font-bold text-gray-900 text-xl mb-6">মেনু দৃশ্যমানতা (Visibility)</h3>
            
            <div className="space-y-6">
               {settings && settings.visibleTabs && Object.entries(settings.visibleTabs).map(([key, value]) => {
                 if (key === '_id') return null;
                 
                 const labels: any = {
                   addMeal: 'মিল যুক্ত করুন অপশন',
                   addExpense: 'খরচ যুক্ত করুন অপশন',
                   addDeposit: 'জমা যুক্ত করুন অপশন',
                   history: 'হিস্ট্রি অপশন',
                   ledger: 'লেজার অপশন',
                 };
                 
                 if (!labels[key]) return null;
                 
                 return (
                   <div key={key} className="flex items-center justify-between border-b border-gray-50 pb-4">
                     <span className="font-bold text-gray-700">{labels[key]}</span>
                     <button
                       onClick={() => handleToggle('visibleTabs', { ...settings.visibleTabs, [key]: !(value as boolean) })}
                       disabled={loading}
                       className={`relative inline-flex h-7 w-12 items-center rounded-full transition-colors focus:outline-none ${value ? 'bg-indigo-600' : 'bg-gray-200'}`}
                     >
                       <span
                         className={`inline-block h-5 w-5 transform rounded-full bg-white transition-transform ${value ? 'translate-x-6' : 'translate-x-1'}`}
                       />
                     </button>
                   </div>
                 );
               })}
            </div>
          </div>
        </div>
        
        {/* Danger Zone */}
        <div className="bg-white rounded-3xl shadow-sm border border-red-100 p-8 bg-red-50/10">
          <h3 className="font-bold text-red-600 text-xl flex items-center gap-2 mb-4">
            <AlertTriangle className="w-6 h-6" /> ডেঞ্জার জোন
          </h3>
          <p className="text-red-500 text-sm font-medium mb-6">
            নিচের অ্যাকশন নিলে তা আর ফেরানো যাবে না। মেসের সম্পূর্ণ ডেটা (মাস, মিল, খরচ, জমা) চিরতরে মুছে যাবে।
          </p>
          
          <div className="bg-white p-6 rounded-2xl border border-red-200 shadow-sm">
            <h4 className="font-bold text-gray-900 mb-2">সম্পূর্ণ মেস ডিলিট করুন</h4>
            <p className="text-sm text-gray-500 mb-4">নিশ্চিত করতে বক্সে হুবহু <span className="font-black text-red-600 bg-red-50 px-2 py-0.5 rounded">DELETE MESS</span> টাইপ করুন।</p>
            
            <input
              type="text"
              value={deleteConfirm}
              onChange={(e) => setDeleteConfirm(e.target.value)}
              placeholder="DELETE MESS"
              className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-red-500 font-bold outline-none mb-4 uppercase"
            />
            
            {deleteError && <p className="text-sm text-red-600 font-bold mb-4">{deleteError}</p>}
            
            <button
              onClick={handleDeleteMess}
              disabled={deleting || deleteConfirm !== 'DELETE MESS'}
              className="w-full flex justify-center items-center gap-2 py-3.5 bg-red-600 hover:bg-red-700 text-white rounded-xl font-bold transition-all disabled:opacity-50"
            >
              {deleting ? <Loader2 className="w-5 h-5 animate-spin" /> : <Trash2 className="w-5 h-5" />}
              {deleting ? 'ডিলিট হচ্ছে...' : 'মেস ডিলিট করুন'}
            </button>
          </div>
        </div>
        
      </div>
    </div>
  );
}
