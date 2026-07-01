"use client";

import { useAuth } from '@/context/AuthContext';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Loader2 } from 'lucide-react';

export default function AuthGuard({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  useEffect(() => {
    // If not loading, no user, and trying to access protected route -> redirect to login
    if (!loading && !user && pathname !== '/login' && pathname !== '/register') {
      router.push('/login');
    }
  }, [user, loading, pathname, router]);

  if (!isClient) return null;

  if (loading) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-gray-50/50">
        <Loader2 className="w-10 h-10 animate-spin text-blue-500" />
      </div>
    );
  }

  // Allow rendering for public routes regardless of auth state
  if (pathname === '/login' || pathname === '/register') {
    return <>{children}</>;
  }

  // For protected routes, don't render children until user is available
  if (!user) {
    return null;
  }

  return <>{children}</>;
}
