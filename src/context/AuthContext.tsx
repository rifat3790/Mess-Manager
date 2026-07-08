"use client";

import React, { createContext, useContext, useEffect, useState } from 'react';
import { onAuthStateChanged, User } from 'firebase/auth';
import { auth } from '@/lib/firebase';

export interface MongoUser {
  _id: string;
  name: string;
  email: string;
  role: 'Super Admin' | 'Manager' | 'Member' | 'Pending';
  messId?: string;
  permissions?: {
    canManageMeals: boolean;
    canManageExpenses: boolean;
    canManageDeposits: boolean;
    canManageNotices: boolean;
    canManageBazaar: boolean;
  };
}

interface AuthContextType {
  user: User | null;
  mongoUser: MongoUser | null;
  loading: boolean;
  messName: string;
  settings: any | null;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  mongoUser: null,
  loading: true,
  messName: "Mohakhali Mess",
  settings: null,
  refreshUser: async () => {}
});

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [mongoUser, setMongoUser] = useState<MongoUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [messName, setMessName] = useState("Mohakhali Mess");
  const [settings, setSettings] = useState<any>(null);

  const fetchSettings = async (userId: string) => {
    try {
      const { getSettings } = await import('@/app/actions/settingsActions');
      const res = await getSettings(userId);
      if (res.success && res.settings) {
        setSettings(res.settings);
        if (res.settings.messName) {
          setMessName(res.settings.messName);
        }
      } else {
        setSettings(null);
        setMessName("Mohakhali Mess");
      }
    } catch (err) {
      console.error("Failed to fetch settings", err);
    }
  };

  const refreshUser = async () => {
    if (auth.currentUser) {
      try {
        const res = await fetch(`/api/auth/me?uid=${auth.currentUser.uid}`);
        if (res.ok) {
          const data = await res.json();
          setMongoUser(data.user);
          if (data.user && data.user._id) {
            await fetchSettings(data.user._id);
          }
        }
      } catch (err) {
        console.error("Failed to refresh user:", err);
      }
    }
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      
      if (currentUser) {
        try {
          let res = await fetch(`/api/auth/me?uid=${currentUser.uid}`);
          
          // If not found, it might be a new Google Sign-In race condition
          if (!res.ok && res.status === 404) {
            // Attempt to create the user just in case
            await fetch('/api/users', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                firebaseUid: currentUser.uid,
                name: currentUser.displayName || 'Google User',
                email: currentUser.email,
              }),
            });
            // Try fetching again
            res = await fetch(`/api/auth/me?uid=${currentUser.uid}`);
          }

          if (res.ok) {
            const data = await res.json();
            setMongoUser(data.user);
            if (data.user && data.user._id) {
              fetchSettings(data.user._id);
            }
          } else {
            setMongoUser(null);
            setSettings(null);
            setMessName("Mohakhali Mess");
          }
        } catch (err) {
          console.error("Failed to fetch mongo user", err);
          setMongoUser(null);
          setSettings(null);
          setMessName("Mohakhali Mess");
        }
      } else {
        setMongoUser(null);
        setSettings(null);
        setMessName("Mohakhali Mess");
      }
      
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  return (
    <AuthContext.Provider value={{ user, mongoUser, loading, messName, settings, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
};
