"use client";

import { useEffect, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { Loader2, Trash2, Edit, Activity } from 'lucide-react';
import { getLedgerData } from '@/app/actions/ledgerActions';
import { deleteMeal, deleteExpense, deleteDeposit, updateMeal, updateExpense, updateDeposit } from '@/app/actions/dataActions';
import { toast } from 'react-hot-toast';

export function LedgerTable() {
  const { mongoUser } = useAuth();
  const [entries, setEntries] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDeleting, setIsDeleting] = useState<string | null>(null);
  
  const [editingEntry, setEditingEntry] = useState<any>(null);
  const [editAmount, setEditAmount] = useState<string>('');
  const [editDescription, setEditDescription] = useState<string>('');
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  async function fetchData() {
    setLoading(true);
    const res = await getLedgerData();
    if (res.success) {
      setEntries(res.entries);
    }
    setLoading(false);
  }

  async function handleDelete(id: string, type: string) {
    if (!window.confirm("আপনি কি নিশ্চিত যে এটি ডিলিট করতে চান?")) return;
    
    setIsDeleting(id);
    let res;
    if (type === 'Meal') res = await deleteMeal(id);
    else if (type === 'Deposit') res = await deleteDeposit(id);
    else res = await deleteExpense(id);

    if (res?.success) {
      toast.success("সফলভাবে ডিলিট হয়েছে!");
      await fetchData();
    } else {
      toast.error("ডিলিট করতে সমস্যা হয়েছে: " + (res?.error || "Unknown error"));
    }
    setIsDeleting(null);
  }

  const openEditModal = (entry: any) => {
    setEditingEntry(entry);
    setEditAmount(entry.amount.toString());
    setEditDescription(entry.description || '');
  };

  const closeEditModal = () => {
    setEditingEntry(null);
    setEditAmount('');
    setEditDescription('');
  };

  const handleSaveEdit = async () => {
    if (!editingEntry) return;
    setIsSaving(true);
    let res;
    
    if (editingEntry.type === 'Meal') {
      res = await updateMeal(editingEntry._id, Number(editAmount));
    } else if (editingEntry.type === 'Deposit') {
      res = await updateDeposit(editingEntry._id, Number(editAmount));
    } else {
      res = await updateExpense(editingEntry._id, Number(editAmount), editDescription);
    }

    if (res?.success) {
      toast.success("সফলভাবে আপডেট হয়েছে!");
      closeEditModal();
      await fetchData();
    } else {
      toast.error("আপডেট করতে সমস্যা হয়েছে: " + (res?.error || "Unknown error"));
    }
    setIsSaving(false);
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="w-10 h-10 animate-spin text-blue-500" />
      </div>
    );
  }

  const canEdit = mongoUser?.role === 'Super Admin' || mongoUser?.role === 'Manager';

  return (
    <div className="w-full space-y-6 mt-8">
      <div className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100 flex items-center gap-4">
        <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center">
          <Activity className="w-6 h-6" />
        </div>
        <div>
          <h2 className="text-xl font-bold text-gray-900">সকল লেনদেন (Ledger)</h2>
          <p className="text-gray-500 text-sm mt-1">মেসের সকল আয়-ব্যয়ের বিস্তারিত ইতিহাস</p>
        </div>
      </div>

      <div className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-gray-200 bg-gray-50/50">
                <th className="p-4 text-sm font-bold text-gray-500 uppercase">তারিখ</th>
                <th className="p-4 text-sm font-bold text-gray-500 uppercase">মেম্বার</th>
                <th className="p-4 text-sm font-bold text-gray-500 uppercase">ধরন</th>
                <th className="p-4 text-sm font-bold text-gray-500 uppercase">বিবরণ</th>
                <th className="p-4 text-sm font-bold text-gray-500 uppercase text-right">পরিমাণ/মিল</th>
                {canEdit && <th className="p-4 text-sm font-bold text-gray-500 uppercase text-center">অ্যাকশন</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {entries.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-gray-500">
                    কোনো তথ্য পাওয়া যায়নি।
                  </td>
                </tr>
              ) : (
                entries.map((entry) => (
                  <tr key={entry._id} className="hover:bg-gray-50 transition-colors">
                    <td className="p-4 text-sm font-semibold text-gray-700 whitespace-nowrap">
                      {new Date(entry.date).toLocaleDateString()}
                    </td>
                    <td className="p-4 text-sm font-bold text-gray-900 capitalize">
                      {entry.memberName}
                    </td>
                    <td className="p-4 text-sm text-gray-600">
                      <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                        entry.type === 'Meal' ? 'bg-blue-100 text-blue-700' :
                        entry.type === 'Deposit' ? 'bg-teal-100 text-teal-700' :
                        'bg-rose-100 text-rose-700'
                      }`}>
                        {entry.type}
                      </span>
                    </td>
                    <td className="p-4 text-sm text-gray-600 font-medium">
                      {entry.description}
                    </td>
                    <td className="p-4 text-sm font-black text-gray-900 text-right">
                      {entry.type === 'Meal' ? entry.amount : `${entry.amount} ৳`}
                    </td>
                    {canEdit && (
                      <td className="p-4 text-center">
                        <div className="flex items-center justify-center gap-2">
                          <button
                            onClick={() => openEditModal(entry)}
                            className="p-2 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                            title="এডিট করুন"
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDelete(entry._id, entry.type)}
                            disabled={isDeleting === entry._id}
                            className="p-2 text-gray-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors disabled:opacity-50"
                            title="ডিলিট করুন"
                          >
                            {isDeleting === entry._id ? (
                              <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                              <Trash2 className="w-4 h-4" />
                            )}
                          </button>
                        </div>
                      </td>
                    )}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {editingEntry && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white rounded-3xl shadow-xl w-full max-w-md overflow-hidden">
             <div className="p-6 border-b border-gray-100">
               <h3 className="text-xl font-bold text-gray-900">ডাটা আপডেট করুন</h3>
             </div>
             <div className="p-6 space-y-4">
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">
                    {editingEntry.type === 'Meal' ? 'মিলের সংখ্যা' : 'টাকার পরিমাণ'}
                  </label>
                  <input 
                    type="number"
                    step={editingEntry.type === 'Meal' ? '0.5' : '1'}
                    value={editAmount}
                    onChange={e => setEditAmount(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-indigo-500 outline-none"
                  />
                </div>
                {editingEntry.type !== 'Meal' && editingEntry.type !== 'Deposit' && (
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-2">বিবরণ</label>
                    <input 
                      type="text"
                      value={editDescription}
                      onChange={e => setEditDescription(e.target.value)}
                      className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-indigo-500 outline-none"
                    />
                  </div>
                )}
             </div>
             <div className="p-6 border-t border-gray-100 flex items-center justify-end gap-3 bg-gray-50/50">
                <button 
                  onClick={closeEditModal}
                  className="px-6 py-2.5 rounded-xl font-bold text-gray-600 hover:bg-gray-200 transition-colors"
                >
                  বাতিল
                </button>
                <button 
                  onClick={handleSaveEdit}
                  disabled={isSaving}
                  className="px-6 py-2.5 rounded-xl font-bold bg-indigo-600 hover:bg-indigo-700 text-white transition-colors flex items-center gap-2"
                >
                  {isSaving && <Loader2 className="w-4 h-4 animate-spin" />}
                  সেভ করুন
                </button>
             </div>
          </div>
        </div>
      )}
    </div>
  );
}
