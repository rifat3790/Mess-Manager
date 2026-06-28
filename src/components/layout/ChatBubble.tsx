"use client";

import { useEffect, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { getUnreadCount } from '@/app/actions/chatActions';
import { MessageSquareText } from 'lucide-react';
import { useRouter, usePathname } from 'next/navigation';

export default function ChatBubble() {
  const { mongoUser } = useAuth();
  const [unreadCount, setUnreadCount] = useState(0);
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    // Only poll if user is logged in
    if (!mongoUser) return;

    const fetchCount = async () => {
      const res = await getUnreadCount(mongoUser._id);
      if (res.success) {
        setUnreadCount(res.count);
      }
    };

    fetchCount();
    const interval = setInterval(fetchCount, 5000);
    return () => clearInterval(interval);
  }, [mongoUser]);

  // Don't show the bubble if user is already on the chat page or not logged in
  if (!mongoUser || pathname === '/chat' || pathname === '/login' || pathname === '/signup') {
    return null;
  }

  return (
    <button
      onClick={() => router.push('/chat')}
      className="fixed bottom-6 right-6 z-50 p-4 bg-blue-600 hover:bg-blue-700 text-white rounded-full shadow-lg hover:shadow-xl transition-all hover:-translate-y-1 group"
    >
      <MessageSquareText className="w-7 h-7" />
      {unreadCount > 0 && (
        <span className="absolute -top-1 -right-1 bg-rose-500 text-white text-[11px] font-black px-2 py-0.5 rounded-full border-2 border-white shadow-sm animate-pulse">
          {unreadCount}
        </span>
      )}
    </button>
  );
}
