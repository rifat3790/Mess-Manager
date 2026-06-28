"use client";

import { useEffect, useState } from 'react';
import { useAuth, MongoUser } from '@/context/AuthContext';
import { Users, CheckCircle, Shield, User as UserIcon, Loader2, Trash2 } from 'lucide-react';
import { updateUserRole } from '@/app/actions/userActions';
import { removeMember } from '@/app/actions/dataActions';
import { toast } from 'react-hot-toast';

export default function MembersPage() {
  const { mongoUser } = useAuth();
  const [users, setUsers] = useState<MongoUser[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      const res = await fetch('/api/users');
      if (res.ok) {
        const data = await res.json();
        setUsers(data.users);
      }
    } catch (error) {
      console.error("Failed to fetch users", error);
    } finally {
      setLoading(false);
    }
  };

  const handleRoleChange = async (userId: string, newRole: string) => {
    // Optimistic update
    setUsers(users.map(u => u._id === userId ? { ...u, role: newRole as any } : u));
    
    const result = await updateUserRole(userId, newRole);
    if (!result.success) {
      alert("Role update failed!");
      fetchUsers(); // Revert on failure
    }
  };

  const handleRemoveMember = async (member: MongoUser) => {
    if (window.confirm(`আপনি কি নিশ্চিত যে আপনি ${member.name}-কে মেস থেকে এবং ডাটাবেস থেকে একেবারে মুছে ফেলতে চান?`)) {
      if (!mongoUser) return;
      const res = await removeMember(mongoUser._id, member._id);
      if (res.success) {
        toast.success(`${member.name}-কে সফলভাবে রিমুভ করা হয়েছে।`);
        fetchUsers();
      } else {
        toast.error('রিমুভ করতে সমস্যা হয়েছে: ' + res.error);
      }
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh]">
        <Loader2 className="w-10 h-10 text-blue-500 animate-spin mb-4" />
      </div>
    );
  }

  // Only Managers and Super Admins should see the management tools
  const canManage = mongoUser?.role === 'Super Admin' || mongoUser?.role === 'Manager';

  return (
    <div className="w-full space-y-6">
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-blue-50 rounded-full flex items-center justify-center">
            <Users className="w-6 h-6 text-blue-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">মেস মেম্বার</h1>
            <p className="text-gray-500 text-sm">সকল মেম্বারদের তালিকা এবং অ্যাক্সেস কন্ট্রোল</p>
          </div>
        </div>
        <div className="text-right">
          <p className="text-sm text-gray-500">মোট মেম্বার</p>
          <p className="text-2xl font-bold text-gray-900">{users.filter(u => u.role !== 'Pending').length} জন</p>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100">
                <th className="px-6 py-4 text-sm font-medium text-gray-500">নাম ও ইমেইল</th>
                <th className="px-6 py-4 text-sm font-medium text-gray-500">স্ট্যাটাস / রোল</th>
                {canManage && <th className="px-6 py-4 text-sm font-medium text-gray-500 text-right">অ্যাকশন</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {users.map((user) => (
                <tr key={user._id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center font-bold">
                        {user.name.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <p className="font-medium text-gray-900">{user.name}</p>
                        <p className="text-xs text-gray-500">{user.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    {user.role === 'Super Admin' && <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium bg-purple-50 text-purple-700 border border-purple-200"><Shield className="w-3.5 h-3.5" /> সুপার অ্যাডমিন</span>}
                    {user.role === 'Manager' && <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium bg-blue-50 text-blue-700 border border-blue-200"><CheckCircle className="w-3.5 h-3.5" /> ম্যানেজার</span>}
                    {user.role === 'Member' && <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200"><UserIcon className="w-3.5 h-3.5" /> মেম্বার</span>}
                    {user.role === 'Pending' && <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium bg-orange-50 text-orange-700 border border-orange-200">অপেক্ষমান</span>}
                  </td>
                  {canManage && (
                    <td className="px-6 py-4 text-right">
                      {user.role === 'Pending' && (
                        <button 
                          onClick={() => handleRoleChange(user._id, 'Member')}
                          className="px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg text-sm font-medium transition-colors"
                        >
                          অ্যাপ্রুভ করুন
                        </button>
                      )}
                      
                      {mongoUser.role === 'Super Admin' && user.role === 'Member' && (
                        <button 
                          onClick={() => handleRoleChange(user._id, 'Manager')}
                          className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg text-sm font-medium transition-colors"
                        >
                          ম্যানেজার বানান
                        </button>
                      )}

                      {mongoUser.role === 'Super Admin' && user.role === 'Manager' && (
                        <button 
                          onClick={() => handleRoleChange(user._id, 'Member')}
                          className="px-4 py-2 bg-gray-500 hover:bg-gray-600 text-white rounded-lg text-sm font-medium transition-colors ml-2"
                        >
                          ম্যানেজার থেকে বাদ দিন
                        </button>
                      )}

                      {/* Remove Member Button */}
                      {(mongoUser.role === 'Super Admin' || mongoUser.role === 'Manager') && user.role !== 'Super Admin' && (
                        <button 
                          onClick={() => handleRemoveMember(user)}
                          className="px-3 py-2 bg-rose-50 hover:bg-rose-100 text-rose-500 rounded-lg transition-colors ml-2"
                          title="মেম্বার রিমুভ করুন"
                        >
                          <Trash2 className="w-5 h-5" />
                        </button>
                      )}
                    </td>
                  )}
                </tr>
              ))}
              
              {users.length === 0 && (
                <tr>
                  <td colSpan={3} className="px-6 py-8 text-center text-gray-500">
                    কোনো মেম্বার পাওয়া যায়নি
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
