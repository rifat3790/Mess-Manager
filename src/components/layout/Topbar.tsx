"use client";

import { Bell, Search, HelpCircle, CheckCircle2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/context/AuthContext';
import { useEffect, useState, useRef } from 'react';
import { getNotifications, markAsRead } from '@/app/actions/notificationActions';
import { useRouter } from 'next/navigation';
import { Menu } from 'lucide-react';

interface TopbarProps {
  onMenuClick?: () => void;
}

export function Topbar({ onMenuClick }: TopbarProps) {
  const { user, mongoUser } = useAuth();
  const [notifications, setNotifications] = useState<any[]>([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const dropdownRef = useRef<HTMLDivElement>(null);
  const router = useRouter();
  
  useEffect(() => {
    const fetchNotifs = async () => {
      if (mongoUser) {
        const res = await getNotifications(mongoUser._id);
        if (res.success) setNotifications(res.notifications);
      }
    };

    fetchNotifs();
    const interval = setInterval(fetchNotifs, 10000); // Poll every 10s

    // Click outside to close dropdown
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      clearInterval(interval);
    };
  }, [mongoUser]);

  const unreadCount = notifications.filter(n => !n.isRead).length;

  const handleMarkAsRead = async (id: string) => {
    await markAsRead(id);
    setNotifications(prev => prev.map(n => n._id === id ? { ...n, isRead: true } : n));
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      router.push(`/ledger`);
      setSearchQuery("");
    }
  };

  return (
    <header className="h-16 bg-white/80 backdrop-blur-md border-b border-gray-200 sticky top-0 z-40 flex items-center justify-between px-4 md:px-6">
      <div className="flex items-center gap-3 flex-1">
        <button 
          onClick={onMenuClick}
          className="md:hidden p-2 -ml-2 text-gray-600 hover:text-gray-900 transition-colors rounded-xl hover:bg-gray-100"
        >
          <Menu className="w-6 h-6" />
        </button>
        <form onSubmit={handleSearch} className="hidden md:flex items-center relative w-64">
          <Search className="w-4 h-4 text-gray-400 absolute left-3" />
          <input 
            type="text" 
            placeholder="খুঁজুন..." 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-gray-50 border border-gray-100 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all placeholder:text-gray-400"
          />
        </form>
      </div>

      <div className="flex items-center gap-4">
        <button className="md:hidden p-2 text-gray-400 hover:text-gray-600 transition-colors rounded-full hover:bg-gray-100">
          <Search className="w-5 h-5" />
        </button>
        <button className="p-2 text-gray-400 hover:text-gray-600 transition-colors rounded-full hover:bg-gray-100">
          <HelpCircle className="w-5 h-5" />
        </button>
        
        <div className="relative" ref={dropdownRef}>
          <button 
            onClick={() => setShowDropdown(!showDropdown)}
            className="p-2 text-rose-400 hover:text-rose-600 transition-colors rounded-full hover:bg-rose-50 relative"
          >
            <Bell className="w-5 h-5" />
            {unreadCount > 0 && (
              <span className="absolute top-1.5 right-1.5 w-2.5 h-2.5 bg-rose-500 rounded-full border-2 border-white"></span>
            )}
          </button>

          {/* Notifications Dropdown */}
          {showDropdown && (
            <div className="absolute right-0 mt-2 w-80 bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden z-50">
              <div className="px-4 py-3 border-b border-gray-50 flex items-center justify-between bg-gray-50/50">
                <h3 className="font-bold text-gray-900">নোটিফিকেশন</h3>
                <span className="text-xs font-medium text-rose-600 bg-rose-50 px-2 py-1 rounded-full">{unreadCount} নতুন</span>
              </div>
              <div className="max-h-[300px] overflow-y-auto">
                {notifications.length === 0 ? (
                  <div className="p-4 text-center text-sm text-gray-500">কোনো নোটিফিকেশন নেই</div>
                ) : (
                  <div className="divide-y divide-gray-50">
                    {notifications.map((notif) => (
                      <div 
                        key={notif._id} 
                        className={`p-4 transition-colors ${!notif.isRead ? 'bg-blue-50/50' : 'hover:bg-gray-50'}`}
                      >
                        <div className="flex justify-between items-start gap-3">
                          <div className="flex-1">
                            <h4 className={`text-sm ${!notif.isRead ? 'font-bold text-gray-900' : 'font-medium text-gray-700'}`}>{notif.title}</h4>
                            <p className="text-xs text-gray-500 mt-1">{notif.message}</p>
                            <p className="text-[10px] text-gray-400 mt-2">{new Date(notif.createdAt).toLocaleString()}</p>
                          </div>
                          {!notif.isRead && (
                            <button 
                              onClick={() => handleMarkAsRead(notif._id)}
                              className="text-blue-500 hover:text-blue-700 p-1"
                              title="মার্ক এজ রিড"
                            >
                              <CheckCircle2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
        
        <div className="h-6 w-px bg-gray-200 mx-2"></div>
        
        <div className="flex items-center gap-3">
           {user ? (
              <div className="w-10 h-10 rounded-xl bg-blue-100 text-blue-600 flex items-center justify-center font-bold text-lg shadow-sm overflow-hidden">
                {user?.photoURL ? (
                  <img src={user.photoURL} alt="Profile" className="w-full h-full object-cover" />
                ) : (
                  (mongoUser?.name?.[0] || user?.email?.[0] || 'U').toUpperCase()
                )}
              </div>
           ) : (
             <div className="w-10 h-10 rounded-xl bg-gray-100 text-gray-400 flex items-center justify-center font-bold text-lg shadow-sm">
                ?
             </div>
           )}
        </div>
      </div>
    </header>
  );
}
