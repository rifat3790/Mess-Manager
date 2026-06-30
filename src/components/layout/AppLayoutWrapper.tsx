"use client";

import { useState } from 'react';
import { Sidebar } from '@/components/layout/Sidebar';
import { Topbar } from '@/components/layout/Topbar';
import ChatBubble from '@/components/layout/ChatBubble';
import { usePathname } from 'next/navigation';

export function AppLayoutWrapper({ children }: { children: React.ReactNode }) {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const pathname = usePathname();

  const isAuthRoute = pathname === '/login' || pathname === '/register' || pathname === '/forgot-password';

  if (isAuthRoute) {
    return (
      <main className="w-full min-h-screen bg-gray-50/50 flex items-center justify-center p-4">
        {children}
      </main>
    );
  }

  return (
    <>
      <div className="flex min-h-screen" suppressHydrationWarning>
        <Sidebar 
          isMobileMenuOpen={isMobileMenuOpen} 
          setIsMobileMenuOpen={setIsMobileMenuOpen} 
        />
        
        {/* Main Content Area */}
        <main className="flex-1 flex flex-col min-h-screen overflow-hidden min-w-0" suppressHydrationWarning>
          <Topbar onMenuClick={() => setIsMobileMenuOpen(true)} />
          <div className="flex-1 overflow-y-auto p-4 md:p-6 scrollbar-thin" suppressHydrationWarning>
            {children}
          </div>
        </main>
      </div>
      <ChatBubble />
    </>
  );
}
