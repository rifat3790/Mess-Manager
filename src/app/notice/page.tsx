"use client";

import { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { Bell, Plus, Edit2, Trash2, Loader2, Save, X, Search, Calendar, User, Sparkles } from 'lucide-react';
import { getLatestNotices, createNotice, deleteNotice, updateNotice, acknowledgeNotice } from '@/app/actions/dataActions';
import { toast } from 'react-hot-toast';

export default function NoticePage() {
  const { mongoUser } = useAuth();

  const getInitialNoticeCache = () => {
    if (typeof window !== 'undefined') {
      try {
        const cached = localStorage.getItem('mess_dashboard_cache_v2');
        if (cached) {
          const parsed = JSON.parse(cached);
          return parsed.notices || [];
        }
      } catch (e) {}
    }
    return [];
  };

  const initialNotices = getInitialNoticeCache();
  const [notices, setNotices] = useState<any[]>(initialNotices);
  const [loading, setLoading] = useState(initialNotices.length === 0);
  
  // Search
  const [searchQuery, setSearchQuery] = useState('');

  // Modals / Forms state
  const [isAdding, setIsAdding] = useState(false);
  const [editingNoticeId, setEditingNoticeId] = useState<string | null>(null);
  
  // Form fields
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [submitLoading, setSubmitLoading] = useState(false);

  const isManagerOrAdmin = mongoUser?.role === 'Super Admin' || mongoUser?.role === 'Manager';

  const fetchNotices = async () => {
    if (!mongoUser) return;
    try {
      if (notices.length === 0) setLoading(true);
      const res = await getLatestNotices(mongoUser._id);
      if (res.success) {
        setNotices(res.notices || []);
      } else {
        toast.error("নোটিশ লোড করতে সমস্যা হয়েছে।");
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (mongoUser) {
      setTimeout(() => {
        fetchNotices();
      }, 0);
    }
  }, [mongoUser]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !content || !mongoUser) return;

    setSubmitLoading(true);
    try {
      if (editingNoticeId) {
        // Update flow
        const res = await updateNotice(editingNoticeId, title, content, mongoUser._id);
        if (res.success) {
          toast.success("নোটিশ সফলভাবে আপডেট করা হয়েছে!");
          setEditingNoticeId(null);
          setTitle('');
          setContent('');
          fetchNotices();
        } else {
          toast.error(res.error || "আপডেট ব্যর্থ হয়েছে।");
        }
      } else {
        // Create flow
        const res = await createNotice(title, content, mongoUser._id);
        if (res.success) {
          toast.success("নোটিশ সফলভাবে পোস্ট করা হয়েছে!");
          setIsAdding(false);
          setTitle('');
          setContent('');
          fetchNotices();
        } else {
          toast.error(res.error || "পোস্ট করতে সমস্যা হয়েছে।");
        }
      }
    } catch (err: any) {
      toast.error(err.message || "ভুল হয়েছে।");
    } finally {
      setSubmitLoading(false);
    }
  };

  const handleEditClick = (notice: any) => {
    setEditingNoticeId(notice._id);
    setTitle(notice.title);
    setContent(notice.content);
    setIsAdding(true);
  };

  const handleDeleteClick = async (noticeId: string) => {
    if (!mongoUser) return;
    if (!confirm("আপনি কি নিশ্চিতভাবে এই নোটিশটি ডিলিট করতে চান?")) return;

    toast.loading("ডিলিট করা হচ্ছে...", { id: 'delete-notice' });
    try {
      const res = await deleteNotice(noticeId, mongoUser._id);
      if (res.success) {
        toast.success("নোটিশ ডিলিট করা হয়েছে!", { id: 'delete-notice' });
        fetchNotices();
      } else {
        toast.error(res.error || "ডিলিট করা যায়নি।", { id: 'delete-notice' });
      }
    } catch (err: any) {
      toast.error(err.message || "ভুল হয়েছে।", { id: 'delete-notice' });
    }
  };

  const handleAcknowledge = async (noticeId: string) => {
    if (!mongoUser) return;
    try {
      const res = await acknowledgeNotice(noticeId, mongoUser._id);
      if (res.success) {
        toast.success("নোটিশটি পড়ার স্বীকৃতি দেওয়া হয়েছে।");
        fetchNotices();
      } else {
        toast.error("স্বীকৃতি দিতে সমস্যা হয়েছে।");
      }
    } catch (err: any) {
      toast.error(err.message || "ভুল হয়েছে।");
    }
  };

  const handleCancel = () => {
    setIsAdding(false);
    setEditingNoticeId(null);
    setTitle('');
    setContent('');
  };

  // Filter Notices
  const filteredNotices = notices.filter(n => 
    n.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    n.content.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (loading && notices.length === 0) {
    return (
      <div className="flex flex-col justify-center items-center min-h-[60vh]">
        <Loader2 className="w-12 h-12 animate-spin text-indigo-500 mb-4" />
        <p className="text-gray-500 font-medium">নোটিশ বোর্ড লোড হচ্ছে...</p>
      </div>
    );
  }

  return (
    <div suppressHydrationWarning className="w-full mt-2 space-y-6 pb-16">
      
      {/* Header Widget */}
      <div className="bg-gradient-to-r from-indigo-50 to-blue-50 rounded-3xl p-6 border border-indigo-100/50 flex items-center justify-between gap-5 shadow-[0_8px_30px_rgb(99,102,241,0.02)]">
        <div className="flex items-center gap-5">
          <div className="w-14 h-14 bg-gradient-to-br from-indigo-500 to-indigo-600 text-white rounded-2xl flex items-center justify-center shadow-md shadow-indigo-200">
            <Bell className="w-7 h-7" />
          </div>
          <div>
            <h2 className="text-2xl font-black text-gray-900 tracking-tight">মেস নোটিশ বোর্ড</h2>
            <p className="text-gray-500 mt-0.5 text-xs font-semibold">মেসের সকল ঘোষণা ও নোটিশসমূহ এখানে পাবেন।</p>
          </div>
        </div>

        {isManagerOrAdmin && !isAdding && (
          <button
            onClick={() => setIsAdding(true)}
            className="flex items-center gap-1.5 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl text-xs transition-colors shadow-md shadow-indigo-100"
          >
            <Plus className="w-4 h-4" /> নোটিশ দিন
          </button>
        )}
      </div>

      {/* Write / Edit Notice Form Overlay-style card */}
      {isAdding && (
        <div className="bg-white rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.03)] p-6 border-l-4 border-indigo-500 animate-slideDown">
          <div className="flex justify-between items-center mb-4 pb-2 border-b border-gray-50">
            <h3 className="font-extrabold text-gray-900 text-sm flex items-center gap-1.5">
              <Sparkles className="w-4 h-4 text-indigo-500 animate-pulse" />
              {editingNoticeId ? 'নোটিশ এডিট করুন' : 'নতুন নোটিশ পোস্ট করুন'}
            </h3>
            <button onClick={handleCancel} className="p-1 hover:bg-gray-100 rounded-lg text-gray-400">
              <X className="w-4.5 h-4.5" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-[11px] font-bold text-gray-500 mb-1.5 uppercase">নোটিশের শিরোনাম (Title)</label>
              <input
                type="text"
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="যেমন: গ্যাস বিল সম্পর্কিত ঘোষণা"
                className="w-full px-4 py-3 bg-gray-50/50 rounded-xl border border-gray-200 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 font-bold text-sm text-gray-800 outline-none transition-all"
              />
            </div>
            <div>
              <label className="block text-[11px] font-bold text-gray-500 mb-1.5 uppercase">বিস্তারিত বিবরণ (Notice Content)</label>
              <textarea
                required
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="মেসের সব মেম্বারদের অবগতির জন্য জানানো যাচ্ছে যে..."
                rows={5}
                className="w-full px-4 py-3 bg-gray-50/50 rounded-xl border border-gray-200 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 font-bold text-sm text-gray-800 outline-none transition-all resize-none"
              />
            </div>
            <div className="flex justify-end gap-2 text-xs font-bold pt-2">
              <button
                type="button"
                onClick={handleCancel}
                className="px-4 py-2.5 bg-gray-50 hover:bg-gray-100 text-gray-600 rounded-xl transition-colors"
              >
                বাতিল
              </button>
              <button
                type="submit"
                disabled={submitLoading}
                className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl transition-colors flex items-center gap-1.5 shadow-md shadow-indigo-150"
              >
                {submitLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                {submitLoading ? 'পোস্ট হচ্ছে...' : editingNoticeId ? 'আপডেট করুন' : 'পোস্ট করুন'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Search Bar */}
      <div className="relative w-full max-w-md bg-white rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.02)]">
        <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
        <input
          type="text"
          placeholder="নোটিশ খুঁজুন..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full pl-10 pr-4 py-2.5 bg-white border border-gray-200 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 font-medium"
        />
      </div>

      {/* Notices List */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {filteredNotices.length === 0 ? (
          <div className="col-span-1 md:col-span-2 text-center py-12 text-gray-400 bg-white rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.03)] font-bold">
            কোনো নোটিশ পাওয়া যায়নি।
          </div>
        ) : (
          filteredNotices.map((notice) => (
            <div 
              key={notice._id} 
              className="bg-white rounded-3xl p-6 shadow-[0_8px_30px_rgb(0,0,0,0.03)] relative overflow-hidden flex flex-col justify-between hover:shadow-md transition-shadow group border-l-4 border-indigo-100 hover:border-indigo-500"
            >
              <div className="space-y-3">
                <div className="flex items-start justify-between gap-3">
                  <h3 className="font-extrabold text-gray-900 text-base capitalize">{notice.title}</h3>
                  
                  {isManagerOrAdmin && (
                    <div className="flex items-center gap-1.5 opacity-60 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={() => handleEditClick(notice)}
                        className="p-1 hover:bg-indigo-50 hover:text-indigo-600 rounded-lg text-gray-400 transition-colors"
                        title="এডিট করুন"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleDeleteClick(notice._id)}
                        className="p-1 hover:bg-rose-50 hover:text-rose-600 rounded-lg text-gray-400 transition-colors"
                        title="মুছে ফেলুন"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )}
                </div>

                <p className="text-gray-600 font-medium text-xs leading-relaxed whitespace-pre-wrap">{notice.content}</p>
              </div>

              {/* Notice Acknowledgment Button / Info */}
              <div className="mt-4 pt-3 border-t border-gray-50 flex items-center justify-between gap-4">
                {notice.acknowledgedBy?.some((u: any) => (u._id || u) === mongoUser?._id) ? (
                  <span className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 text-emerald-700 font-extrabold text-[10px] rounded-xl border border-emerald-100/50">
                    ✓ আপনি পড়েছেন
                  </span>
                ) : (
                  <button
                    onClick={() => handleAcknowledge(notice._id)}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-extrabold text-[10px] rounded-xl transition-all border border-indigo-100/50 active:scale-95 cursor-pointer"
                  >
                    আমি পড়েছি
                  </button>
                )}
                
                {notice.acknowledgedBy && notice.acknowledgedBy.length > 0 && (
                  <div className="text-[10px] text-gray-500 font-medium max-w-[60%] truncate" title={notice.acknowledgedBy.map((u: any) => u.name).join(', ')}>
                    <span className="font-extrabold text-gray-700">পড়েছেন ({notice.acknowledgedBy.length}):</span> {notice.acknowledgedBy.map((u: any) => u.name?.split(' ')[0]).join(', ')}
                  </div>
                )}
              </div>

              <div className="mt-3 pt-3.5 border-t border-gray-50 flex items-center justify-between text-[10px] font-bold text-gray-400">
                <span className="flex items-center gap-1.5">
                  <User className="w-3.5 h-3.5 text-gray-400" />
                  {notice.createdBy?.name || 'অ্যাডমিন'} ({notice.createdBy?.role === 'Super Admin' ? 'Super Admin' : 'Manager'})
                </span>
                <span className="flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-gray-400" />
                  {new Date(notice.createdAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                </span>
              </div>
            </div>
          ))
        )}
      </div>

    </div>
  );
}
