"use client";

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { 
  Home, 
  Wallet, 
  Utensils, 
  ShoppingBag, 
  FileText, 
  Files, 
  CalendarPlus, 
  Users, 
  UserCog, 
  Settings, 
  Trash2,
  LogOut,
  LogIn,
  ShieldCheck,
  Activity,
  CalendarDays,
  Receipt,
  Coffee,
  PlusCircle,
  BookOpen,
  MessageSquare
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/context/AuthContext';
import { auth } from '@/lib/firebase';
import { signOut } from 'firebase/auth';
import { usePathname } from 'next/navigation';
import { getSettings } from '@/app/actions/settingsActions';

interface SidebarProps {
  className?: string;
  isMobileMenuOpen?: boolean;
  setIsMobileMenuOpen?: (isOpen: boolean) => void;
}

export function Sidebar({ className, isMobileMenuOpen = false, setIsMobileMenuOpen }: SidebarProps) {
  const { user, mongoUser, loading, messName } = useAuth();
  const pathname = usePathname();
  const [settings, setSettings] = useState<any>(null);

  useEffect(() => {
    async function fetchSettings() {
      const res = await getSettings();
      if (res.success) {
        setSettings(res.settings.visibleTabs);
      }
    }
    fetchSettings();
  }, []);

  const handleLogout = async () => {
    try {
      await signOut(auth);
    } catch (error) {
      console.error("Error signing out: ", error);
    }
  };

  const getMenuItems = () => {
    const role = mongoUser?.role;
    
    // Start with empty items
    let items = [
      { name: 'হোম পেজ', icon: Home, href: '/' },
    ];

    if (role === 'Member' && settings) {
      if (settings.addMeal) items.push({ name: 'মিল যুক্ত', icon: Utensils, href: '/meal' });
      if (settings.addExpense) items.push({ name: 'খরচ যুক্ত', icon: ShoppingBag, href: '/expense' });
      if (settings.addDeposit) items.push({ name: 'টাকা জমা', icon: Wallet, href: '/deposit' });
      if (settings.history) {
        items.push({ name: 'চলমান মাসের হিসাব', icon: FileText, href: '/report/single' });
        items.push({ name: 'সকল মাসের হিসাব', icon: Files, href: '/report/all' });
      }
      if (settings.ledger) items.push({ name: 'সকল লেনদেন ও হিসাব', icon: Activity, href: '/ledger' });
      items.push({ name: 'বাজারের তারিখ', icon: CalendarDays, href: '/bazaar' });
      items.push({ name: 'মেস চ্যাট', icon: MessageSquare, href: '/chat' });
    }

    if (role === 'Manager' || role === 'Super Admin') {
      items = [
        { name: 'হোম পেজ', icon: Home, href: '/' },
        { name: 'টাকা জমা', icon: Wallet, href: '/deposit' },
        { name: 'মিল যুক্ত', icon: Utensils, href: '/meal' },
        { name: 'খরচ যুক্ত', icon: ShoppingBag, href: '/expense' },
        { name: 'বাজার শিডিউল', icon: CalendarPlus, href: '/bazaar' },
        { name: 'সকল লেনদেন ও হিসাব', icon: Activity, href: '/ledger' },
        { name: 'চলমান মাসের হিসাব', icon: FileText, href: '/report/single' },
        { name: 'সকল মাসের হিসাব', icon: Files, href: '/report/all' },
        { name: 'নতুন মাস শুরু করুন', icon: CalendarPlus, href: '/month/new' },
        { name: 'মেস মেম্বার', icon: Users, href: '/members' },
        { name: 'অ্যাডমিন', icon: ShieldCheck, href: '/admin' },
        { name: 'বাজারের তারিখ', icon: CalendarDays, href: '/bazaar' },
        { name: 'মেস চ্যাট', icon: MessageSquare, href: '/chat' }
      ];
    }

    if (role === 'Super Admin') {
      items.push(
        { name: 'ম্যানেজার পরিবর্তন', icon: UserCog, href: '/manager' },
        { name: 'মেস সেটিংস ও ডিলিট', icon: Settings, href: '/settings' }
      );
    }

    return items;
  };

  const menuItems = getMenuItems();

  return (
    <>
      {/* Mobile Overlay */}
      {isMobileMenuOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 md:hidden backdrop-blur-sm transition-opacity"
          onClick={() => setIsMobileMenuOpen && setIsMobileMenuOpen(false)}
        />
      )}

      {/* Sidebar Content */}
      <aside className={cn(
        "w-64 bg-white/95 md:bg-white/80 backdrop-blur-md border-r border-gray-200 h-[100dvh] md:h-screen sticky top-0 flex flex-col z-50 transition-transform duration-300 ease-in-out",
        "fixed md:relative inset-y-0 left-0",
        isMobileMenuOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0",
        className
      )}>
      <div className="p-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-rose-500 rounded-xl flex items-center justify-center text-white font-bold text-xl shadow-lg shadow-rose-500/30">
            {messName?.charAt(0) || 'M'}
          </div>
          <h1 className="text-xl font-bold bg-gradient-to-r from-gray-900 to-gray-600 bg-clip-text text-transparent truncate">
            {messName || 'Mohakhali Mess'}
          </h1>
        </div>
      </div>
      
      <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-1 scrollbar-thin">
        {!loading && user && mongoUser && mongoUser.role !== 'Pending' && menuItems.map((item, index) => (
          <Link
            key={index}
            href={item.href}
            className={cn(
              "flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200",
              pathname === item.href 
                ? "bg-rose-50 text-rose-600" 
                : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
            )}
          >
            <item.icon className={cn("w-5 h-5", pathname === item.href ? "text-rose-500" : "text-gray-400")} />
            {item.name}
          </Link>
        ))}
      </nav>

      <div className="p-4 border-t border-gray-100">
        {loading ? (
           <div className="h-12 bg-gray-100 rounded-xl animate-pulse"></div>
        ) : user ? (
          <div className="flex items-center justify-between gap-3 bg-gray-50 p-3 rounded-xl border border-gray-100">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-bold flex-shrink-0 overflow-hidden">
                {user?.photoURL ? (
                  <img src={user.photoURL} alt="Profile" className="w-full h-full object-cover" />
                ) : (
                  (mongoUser?.name?.[0] || user.email?.[0] || 'U').toUpperCase()
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 truncate">{mongoUser?.name || user?.displayName || 'User'}</p>
                <p className="text-xs text-gray-500 truncate">{mongoUser?.role || 'Pending'}</p>
              </div>
            </div>
            <button onClick={handleLogout} className="p-2 text-gray-400 hover:text-rose-500 hover:bg-rose-50 rounded-lg transition-colors">
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        ) : null}
      </div>
    </aside>
    </>
  );
}
