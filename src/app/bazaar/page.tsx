"use client";

import { useState, useEffect } from 'react';
import { useAuth, MongoUser } from '@/context/AuthContext';
import { Calendar, Loader2, CheckCircle, Trash2, UserPlus } from 'lucide-react';
import { getBazaarSchedules, assignBazaarSchedule, updateBazaarScheduleStatus, deleteBazaarSchedule } from '@/app/actions/bazaarActions';
import { getMembers } from '@/app/actions/dataActions';

export default function ManageBazaarPage() {
  const { mongoUser } = useAuth();
  
  const [schedules, setSchedules] = useState<any[]>([]);
  const [members, setMembers] = useState<MongoUser[]>([]);
  
  // Assign form state
  const [userId, setUserId] = useState('');
  const [fromDate, setFromDate] = useState(new Date().toISOString().split('T')[0]);
  const [toDate, setToDate] = useState(new Date().toISOString().split('T')[0]);
  
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [schedRes, memRes] = await Promise.all([
        getBazaarSchedules(),
        getMembers()
      ]);
      if (schedRes.success) setSchedules(schedRes.schedules || []);
      if (memRes.success) {
        setMembers(memRes.users || []);
        if (memRes.users && memRes.users.length > 0) {
          setUserId(memRes.users[0]._id);
        }
      }
    } catch (err) {
      console.error(err);
    } finally {
      setFetching(false);
    }
  };

  const isManagerOrAdmin = mongoUser?.role === 'Super Admin' || mongoUser?.role === 'Manager';

  const handleAssign = async (e: React.FormEvent) => {
    e.preventDefault();
    if (new Date(fromDate) > new Date(toDate)) {
      setError('শুরুর তারিখ শেষের তারিখের চেয়ে বড় হতে পারে না।');
      return;
    }

    setLoading(true);
    setMessage('');
    setError('');

    try {
      const res = await assignBazaarSchedule(userId, new Date(fromDate), new Date(toDate));
      if (res.success) {
        setMessage('শিডিউল সফলভাবে অ্যাসাইন করা হয়েছে!');
        fetchData(); // Reload list
      } else {
        setError(res.error || 'অ্যাসাইন করতে সমস্যা হয়েছে।');
      }
    } catch (err: any) {
      setError(err.message || 'Error occurred');
    } finally {
      setLoading(false);
    }
  };

  const handleStatusChange = async (id: string, status: 'Approved' | 'Pending' | 'Completed') => {
    try {
      const res = await updateBazaarScheduleStatus(id, status);
      if (res.success) {
        fetchData();
      } else {
        alert(res.error || 'স্ট্যাটাস আপডেট করতে সমস্যা হয়েছে।');
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('আপনি কি এই শিডিউলটি ডিলিট করতে চান?')) return;
    try {
      const res = await deleteBazaarSchedule(id);
      if (res.success) {
        fetchData();
      } else {
        alert(res.error || 'ডিলিট করতে সমস্যা হয়েছে।');
      }
    } catch (err) {
      console.error(err);
    }
  };

  if (fetching) {
    return <div className="flex justify-center p-10"><Loader2 className="w-8 h-8 animate-spin text-indigo-500" /></div>;
  }

  return (
    <div className="w-full mt-4 space-y-8">
      
      {/* Header */}
      <div className="bg-white rounded-3xl p-8 shadow-sm border border-gray-100 flex items-center gap-4">
        <div className="w-14 h-14 bg-indigo-50 text-indigo-500 rounded-2xl flex items-center justify-center">
          <Calendar className="w-7 h-7" />
        </div>
        <div>
          <h2 className="text-2xl font-bold text-gray-900">বাজার শিডিউল ম্যানেজমেন্ট</h2>
          <p className="text-gray-500 mt-1">মেম্বারদের বাজারের ডেট অ্যাপ্রুভ বা নতুন অ্যাসাইন করুন</p>
        </div>
      </div>
      
      {message && <div className="bg-emerald-50 text-emerald-600 p-4 rounded-xl text-sm border border-emerald-100 font-bold">{message}</div>}
      {error && <div className="bg-red-50 text-red-600 p-4 rounded-xl text-sm border border-red-100 font-bold">{error}</div>}
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Assign New Form (Only for Admins/Managers) */}
        {isManagerOrAdmin && (
          <div className="lg:col-span-1">
            <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-6 sticky top-8">
              <h3 className="font-bold text-gray-900 text-lg flex items-center gap-2 mb-6">
                <UserPlus className="w-5 h-5 text-indigo-500" /> 
                নতুন ডেট অ্যাসাইন করুন
              </h3>
              
              <form onSubmit={handleAssign} className="space-y-4">
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1">মেম্বার সিলেক্ট করুন</label>
                  <select
                    required
                    value={userId}
                    onChange={(e) => setUserId(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:ring-2 focus:ring-indigo-500 font-medium outline-none"
                  >
                    {members.map(m => (
                      <option key={m._id} value={m._id}>{m.name}</option>
                    ))}
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1">From Date</label>
                  <input
                    type="date"
                    required
                    value={fromDate}
                    onChange={(e) => setFromDate(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:ring-2 focus:ring-indigo-500 font-medium outline-none"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1">To Date</label>
                  <input
                    type="date"
                    required
                    value={toDate}
                    onChange={(e) => setToDate(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:ring-2 focus:ring-indigo-500 font-medium outline-none"
                  />
                </div>
                
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold transition-all shadow-sm shadow-indigo-200 disabled:opacity-70 mt-2"
                >
                  {loading ? <Loader2 className="w-5 h-5 animate-spin mx-auto" /> : 'অ্যাসাইন করুন'}
                </button>
              </form>
            </div>
          </div>
        )}
        
        {/* Existing Schedules */}
        <div className="lg:col-span-2">
           <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
             <div className="p-6 border-b border-gray-100 bg-gray-50/50">
               <h3 className="font-bold text-gray-800 text-lg">চলমান মাসের সকল শিডিউল</h3>
             </div>
             
             <div className="divide-y divide-gray-100">
               {schedules.length === 0 ? (
                 <div className="p-10 text-center text-gray-500 font-medium">কোনো শিডিউল পাওয়া যায়নি।</div>
               ) : (
                 schedules.map(schedule => (
                   <div key={schedule._id} className="p-6 flex flex-col md:flex-row items-center justify-between gap-4 hover:bg-gray-50/50 transition-colors">
                     
                     <div className="flex items-center gap-4">
                       <div className="w-12 h-12 bg-gray-100 text-gray-700 rounded-full flex items-center justify-center font-bold text-xl">
                         {schedule.userId?.name?.charAt(0).toUpperCase()}
                       </div>
                       <div>
                         <p className="font-bold text-gray-900 text-lg">{schedule.userId?.name}</p>
                         <p className="text-gray-500 text-sm font-medium">
                           {new Date(schedule.fromDate).toLocaleDateString('en-GB')} - {new Date(schedule.toDate).toLocaleDateString('en-GB')}
                         </p>
                       </div>
                     </div>
                     
                     <div className="flex items-center gap-3">
                        {schedule.status === 'Pending' ? (
                          isManagerOrAdmin ? (
                            <button
                              onClick={() => handleStatusChange(schedule._id, 'Approved')}
                              className="flex items-center gap-1.5 px-4 py-2 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200 rounded-xl font-bold text-sm transition-colors"
                            >
                              <CheckCircle className="w-4 h-4" /> অ্যাপ্রুভ করুন
                            </button>
                          ) : (
                            <span className="flex items-center gap-1.5 px-4 py-2 bg-amber-50 text-amber-600 border border-amber-200 rounded-xl font-bold text-sm">
                              পেন্ডিং
                            </span>
                          )
                        ) : schedule.status === 'Approved' ? (
                          isManagerOrAdmin ? (
                            <button
                              onClick={() => handleStatusChange(schedule._id, 'Completed')}
                              className="flex items-center gap-1.5 px-4 py-2 bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200 rounded-xl font-bold text-sm transition-colors"
                            >
                              <CheckCircle className="w-4 h-4" /> মার্ক অ্যাজ ডান
                            </button>
                          ) : (
                            <span className="flex items-center gap-1.5 px-4 py-2 bg-emerald-50 text-emerald-600 rounded-xl font-bold text-sm">
                              <CheckCircle className="w-4 h-4" /> অ্যাপ্রুভড
                            </span>
                          )
                        ) : (
                          <span className="flex items-center gap-1.5 px-4 py-2 bg-indigo-50 text-indigo-600 rounded-xl font-bold text-sm">
                            <CheckCircle className="w-4 h-4" /> সম্পন্ন হয়েছে
                          </span>
                        )}
                        
                        {isManagerOrAdmin && (
                          <button
                            onClick={() => handleDelete(schedule._id)}
                            className="p-2 text-red-500 hover:bg-red-50 rounded-xl transition-colors"
                            title="Delete"
                          >
                            <Trash2 className="w-5 h-5" />
                          </button>
                        )}
                      </div>
                     
                   </div>
                 ))
               )}
             </div>
           </div>
        </div>
        
      </div>
    </div>
  );
}
