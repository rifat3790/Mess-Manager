"use client";

import { useEffect, useState } from 'react';
import { useAuth, MongoUser } from '@/context/AuthContext';
import { Users, CheckCircle, Shield, User as UserIcon, Loader2, Trash2, Key } from 'lucide-react';
import { updateUserRole } from '@/app/actions/userActions';
import { removeMember } from '@/app/actions/dataActions';
import { updateUserPermissions } from '@/app/actions/adminActions';
import { toast } from 'react-hot-toast';

export default function MembersPage() {
  const { mongoUser } = useAuth();
  const [users, setUsers] = useState<MongoUser[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Permission management states
  const [selectedUserForPerms, setSelectedUserForPerms] = useState<any | null>(null);
  const [permsState, setPermsState] = useState({
    canManageMeals: false,
    canManageExpenses: false,
    canManageDeposits: false,
    canManageNotices: false,
    canManageBazaar: false
  });
  const [permsSaving, setPermsSaving] = useState(false);

  useEffect(() => {
    if (mongoUser) {
      fetchUsers();
    }
  }, [mongoUser]);

  const fetchUsers = async () => {
    if (!mongoUser?._id) return;
    try {
      const { getMembers } = await import('@/app/actions/dataActions');
      const res = await getMembers(mongoUser._id);
      if (res.success && res.users) {
        setUsers(res.users);
      }
    } catch (error) {
      console.error("Failed to fetch users", error);
    } finally {
      setLoading(false);
    }
  };

  const handleRoleChange = async (userId: string, newRole: string) => {
    if (!mongoUser) return;
    // Optimistic update
    setUsers(users.map(u => u._id === userId ? { ...u, role: newRole as any } : u));
    
    const result = await updateUserRole(userId, newRole, mongoUser._id);
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

  const handleOpenPermsModal = (user: any) => {
    setSelectedUserForPerms(user);
    setPermsState({
      canManageMeals: user.permissions?.canManageMeals || false,
      canManageExpenses: user.permissions?.canManageExpenses || false,
      canManageDeposits: user.permissions?.canManageDeposits || false,
      canManageNotices: user.permissions?.canManageNotices || false,
      canManageBazaar: user.permissions?.canManageBazaar || false
    });
  };

  const handleSavePermissions = async () => {
    if (!selectedUserForPerms || !mongoUser) return;
    setPermsSaving(true);
    try {
      const res = await updateUserPermissions(mongoUser._id, selectedUserForPerms._id, permsState);
      if (res.success) {
        toast.success('পারমিশন সফলভাবে আপডেট হয়েছে!');
        setSelectedUserForPerms(null);
        fetchUsers();
      } else {
        toast.error('পারমিশন আপডেট করতে সমস্যা হয়েছে: ' + res.error);
      }
    } catch (err: any) {
      toast.error('ভুল হয়েছে: ' + err.message);
    } finally {
      setPermsSaving(false);
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
                      {/* Access Control Button */}
                      {mongoUser.role === 'Manager' && user.role !== 'Manager' && (
                        <button 
                          onClick={() => handleOpenPermsModal(user)}
                          className="px-3 py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-600 rounded-lg transition-colors ml-2"
                          title="অ্যাক্সেস ও পারমিশন কন্ট্রোল করুন"
                        >
                          <Key className="w-5 h-5" />
                        </button>
                      )}

                      {/* Remove Member Button */}
                      {mongoUser.role === 'Manager' && user.role !== 'Manager' && (
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

      {/* Permission delegation Modal */}
      {selectedUserForPerms && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white rounded-3xl shadow-xl w-full max-w-md overflow-hidden">
            <div className="p-6 border-b border-gray-100">
              <h3 className="text-lg font-extrabold text-gray-900 flex items-center gap-2">
                <Key className="w-5 h-5 text-indigo-600" />
                অ্যাক্সেস পারমিশন কন্ট্রোল
              </h3>
              <p className="text-xs font-bold text-gray-400 mt-1 capitalize">মেম্বার: {selectedUserForPerms.name}</p>
            </div>
            
            <div className="p-6 space-y-5">
              <p className="text-xs font-extrabold text-gray-400 uppercase tracking-wider mb-2">এই মেম্বারকে যে সকল অ্যাক্সেস দিতে চান:</p>
              
              {/* Can Manage Meals */}
              <label className="flex items-center justify-between p-3.5 bg-gray-50/50 border border-gray-100 rounded-2xl cursor-pointer hover:bg-gray-50 transition-colors">
                <div className="flex items-center gap-2.5">
                  <span className="text-lg">🍳</span>
                  <div>
                    <p className="text-xs font-black text-gray-800">মিল ম্যানেজার (Manage Meals)</p>
                    <p className="text-[9px] font-bold text-gray-400">মিল যুক্ত, এডিট এবং রিকোয়েস্ট অ্যাপ্রুভাল অ্যাক্সেস</p>
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={permsState.canManageMeals}
                  onChange={(e) => setPermsState(prev => ({ ...prev, canManageMeals: e.target.checked }))}
                  className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500 w-4 h-4 cursor-pointer"
                />
              </label>

              {/* Can Manage Expenses */}
              <label className="flex items-center justify-between p-3.5 bg-gray-50/50 border border-gray-100 rounded-2xl cursor-pointer hover:bg-gray-50 transition-colors">
                <div className="flex items-center gap-2.5">
                  <span className="text-lg">🤝</span>
                  <div>
                    <p className="text-xs font-black text-gray-800">খরচ ম্যানেজার (Manage Expenses)</p>
                    <p className="text-[9px] font-bold text-gray-400">মেসের বাজার ও যৌথ খরচ যুক্ত/নিয়ন্ত্রণ অ্যাক্সেস</p>
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={permsState.canManageExpenses}
                  onChange={(e) => setPermsState(prev => ({ ...prev, canManageExpenses: e.target.checked }))}
                  className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500 w-4 h-4 cursor-pointer"
                />
              </label>

              {/* Can Manage Deposits */}
              <label className="flex items-center justify-between p-3.5 bg-gray-50/50 border border-gray-100 rounded-2xl cursor-pointer hover:bg-gray-50 transition-colors">
                <div className="flex items-center gap-2.5">
                  <span className="text-lg">💵</span>
                  <div>
                    <p className="text-xs font-black text-gray-800">জমা ও কন্টাক্ট ম্যানেজার (Deposits & Contacts)</p>
                    <p className="text-[9px] font-bold text-gray-400">সদস্যদের টাকা জমা ও হেল্পডেস্ক কন্টাক্ট অ্যাক্সেস</p>
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={permsState.canManageDeposits}
                  onChange={(e) => setPermsState(prev => ({ ...prev, canManageDeposits: e.target.checked }))}
                  className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500 w-4 h-4 cursor-pointer"
                />
              </label>

              {/* Can Manage Notices */}
              <label className="flex items-center justify-between p-3.5 bg-gray-50/50 border border-gray-100 rounded-2xl cursor-pointer hover:bg-gray-50 transition-colors">
                <div className="flex items-center gap-2.5">
                  <span className="text-lg">📢</span>
                  <div>
                    <p className="text-xs font-black text-gray-800">নোটিশ ম্যানেজার (Manage Notices)</p>
                    <p className="text-[9px] font-bold text-gray-400">মেস নোটিশ বোর্ড কন্ট্রোল ও নতুন এনাউন্সমেন্ট অ্যাক্সেস</p>
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={permsState.canManageNotices}
                  onChange={(e) => setPermsState(prev => ({ ...prev, canManageNotices: e.target.checked }))}
                  className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500 w-4 h-4 cursor-pointer"
                />
              </label>

              {/* Can Manage Bazaar */}
              <label className="flex items-center justify-between p-3.5 bg-gray-50/50 border border-gray-100 rounded-2xl cursor-pointer hover:bg-gray-50 transition-colors">
                <div className="flex items-center gap-2.5">
                  <span className="text-lg">🛒</span>
                  <div>
                    <p className="text-xs font-black text-gray-800">বাজার শিডিউল ও চেকলিস্ট (Bazaar & Checklist)</p>
                    <p className="text-[9px] font-bold text-gray-400">বাজারের তারিখ বণ্টন ও চেকলিস্ট আইটেম কন্ট্রোল অ্যাক্সেস</p>
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={permsState.canManageBazaar}
                  onChange={(e) => setPermsState(prev => ({ ...prev, canManageBazaar: e.target.checked }))}
                  className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500 w-4 h-4 cursor-pointer"
                />
              </label>
            </div>

            <div className="p-6 border-t border-gray-100 flex items-center justify-end gap-3 bg-gray-50/50">
              <button 
                onClick={() => setSelectedUserForPerms(null)}
                className="px-5 py-2.5 rounded-xl font-bold text-xs text-gray-600 hover:bg-gray-200 transition-colors"
              >
                বাতিল
              </button>
              <button 
                onClick={handleSavePermissions}
                disabled={permsSaving}
                className="px-5 py-2.5 rounded-xl font-bold text-xs bg-indigo-600 hover:bg-indigo-700 text-white transition-colors flex items-center gap-2"
              >
                {permsSaving && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                সংরক্ষণ করুন
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
