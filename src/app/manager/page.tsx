"use client";

import { useAuth } from '@/context/AuthContext';
import { UserCog, Loader2, ShieldCheck, CheckCircle2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import { changeManager } from '@/app/actions/userActions';
import { useRouter } from 'next/navigation';

export default function ChangeManagerPage() {
  const { mongoUser, loading: authLoading } = useAuth();
  const router = useRouter();
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  useEffect(() => {
    if (!authLoading && (!mongoUser || mongoUser.role !== 'Manager')) {
      router.push('/');
    }
  }, [mongoUser, authLoading, router]);

  useEffect(() => {
    async function fetchUsers() {
      if (!mongoUser?._id) return;
      try {
        const { getMembers } = await import('@/app/actions/dataActions');
        const res = await getMembers(mongoUser._id);
        if (res.success && res.users) {
          // Filter out the current user (the current Manager) and Pending users
          setUsers(res.users.filter((u: any) => u._id !== mongoUser._id && u.role !== 'Pending'));
        }
      } catch (error) {
        console.error("Error fetching users:", error);
      }
      setLoading(false);
    }
    fetchUsers();
  }, [mongoUser]);

  const handleMakeManager = async (userId: string, currentRole: string) => {
    if (currentRole === 'Manager') return;
    
    if (confirm("আপনি কি নিশ্চিত যে আপনি এই মেম্বারকে নতুন ম্যানেজার বানাতে চান? আগের ম্যানেজার তার দায়িত্ব হারিয়ে মেম্বার হয়ে যাবেন।")) {
      setUpdatingId(userId);
      const res = await changeManager(userId, mongoUser!._id);
      if (res.success) {
        alert("ম্যানেজার সফলভাবে পরিবর্তন করা হয়েছে!");
        window.location.href = '/';
      } else {
        alert("ম্যানেজার পরিবর্তন করতে সমস্যা হয়েছে!");
      }
      setUpdatingId(null);
    }
  };

  if (authLoading || loading) {
    return (
      <div className="flex justify-center items-center min-h-[60vh]">
        <Loader2 className="w-10 h-10 animate-spin text-blue-500" />
      </div>
    );
  }

  if (mongoUser?.role !== 'Manager') return null;

  return (
    <div className="w-full space-y-6 mt-4">
      <div className="bg-white p-8 rounded-3xl shadow-sm border border-gray-100 flex items-center gap-4">
        <div className="w-14 h-14 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center">
          <UserCog className="w-7 h-7" />
        </div>
        <div>
          <h2 className="text-2xl font-bold text-gray-900">ম্যানেজার পরিবর্তন</h2>
          <p className="text-gray-500 mt-1">যেকোনো মেম্বারকে নতুন ম্যানেজার হিসেবে নিয়োগ দিন</p>
        </div>
      </div>

      <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="p-6 border-b border-gray-100 bg-gray-50/50">
          <h3 className="font-bold text-gray-800">মেম্বার তালিকা</h3>
        </div>
        
        <div className="p-2">
          {users.length === 0 ? (
            <p className="p-6 text-center text-gray-500">কোনো মেম্বার পাওয়া যায়নি</p>
          ) : (
            <div className="divide-y divide-gray-100">
              {users.map(u => (
                <div key={u._id} className="p-4 flex items-center justify-between hover:bg-gray-50 transition-colors rounded-xl">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center font-bold text-lg">
                      {u.name.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <p className="font-bold text-gray-900">{u.name}</p>
                      <p className="text-sm text-gray-500">{u.email}</p>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-4">
                    {u.role === 'Manager' ? (
                      <span className="flex items-center gap-2 text-emerald-600 bg-emerald-50 px-4 py-2 rounded-full text-sm font-bold">
                        <ShieldCheck className="w-4 h-4" /> বর্তমান ম্যানেজার
                      </span>
                    ) : (
                      <button 
                        onClick={() => handleMakeManager(u._id, u.role)}
                        disabled={updatingId === u._id}
                        className="flex items-center gap-2 text-indigo-600 bg-indigo-50 hover:bg-indigo-100 px-4 py-2 rounded-full text-sm font-bold transition-colors disabled:opacity-50"
                      >
                        {updatingId === u._id ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                        ম্যানেজার বানান
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
