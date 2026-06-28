"use client";

import { useEffect, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { Loader2, Settings2, ShieldCheck, ToggleLeft, ToggleRight, Save } from 'lucide-react';
import { getSettings, updateSettings } from '../actions/settingsActions';

export default function AdminPage() {
  const { user, mongoUser } = useAuth();
  const [settings, setSettings] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  async function fetchData() {
    const res = await getSettings();
    if (res.success) {
      setSettings(res.settings.visibleTabs);
    }
    setLoading(false);
  }

  const toggleTab = (key: string) => {
    setSettings((prev: any) => ({
      ...prev,
      [key]: !prev[key]
    }));
  };

  const saveSettings = async () => {
    setSaving(true);
    const res = await updateSettings(settings);
    if (res.success) {
      alert("সেটিংস সেভ হয়েছে!");
    } else {
      alert("সেভ করতে সমস্যা হয়েছে: " + res.error);
    }
    setSaving(false);
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="w-10 h-10 animate-spin text-blue-500" />
      </div>
    );
  }

  if (mongoUser?.role !== 'Super Admin' && mongoUser?.role !== 'Manager') {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh]">
        <ShieldCheck className="w-16 h-16 text-rose-500 mb-4" />
        <h2 className="text-2xl font-bold text-gray-900">অ্যাক্সেস ডিনাইড</h2>
        <p className="text-gray-500 mt-2">এই পেজটি দেখার পারমিশন আপনার নেই।</p>
      </div>
    );
  }

  const tabs = [
    { key: 'addMeal', label: 'মিল যুক্ত' },
    { key: 'addExpense', label: 'খরচ যুক্ত' },
    { key: 'addDeposit', label: 'টাকা জমা' },
    { key: 'history', label: 'সকল মাসের হিসাব' },
    { key: 'ledger', label: 'সকল লেনদেন ও হিসাব (Ledger)' },
  ];

  return (
    <div className="w-full space-y-6">
      <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
        <h2 className="text-xl font-bold text-gray-900 mb-2 flex items-center gap-2">
          <Settings2 className="w-6 h-6 text-indigo-500" />
          অ্যাডমিন প্যানেল
        </h2>
        <p className="text-gray-500 text-sm mb-8">মেম্বারদের জন্য কোন কোন মেন্যু/ট্যাবগুলো দেখা যাবে তা এখান থেকে সেট করুন।</p>

        <div className="space-y-4 bg-gray-50 p-6 rounded-xl border border-gray-100">
          <h3 className="font-semibold text-gray-900 mb-4 border-b border-gray-200 pb-2">মেন্যু দৃশ্যমানতা (Tab Visibility)</h3>
          
          {tabs.map((tab) => (
            <div key={tab.key} className="flex items-center justify-between py-2">
              <span className="text-gray-700 font-medium">{tab.label}</span>
              <button 
                onClick={() => toggleTab(tab.key)}
                className={`flex items-center transition-colors ${settings[tab.key] ? 'text-teal-500' : 'text-gray-400'}`}
              >
                {settings[tab.key] ? (
                  <ToggleRight className="w-8 h-8" />
                ) : (
                  <ToggleLeft className="w-8 h-8" />
                )}
              </button>
            </div>
          ))}

          <div className="pt-6 mt-4 border-t border-gray-200">
            <button 
              onClick={saveSettings}
              disabled={saving}
              className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-medium transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
              সেভ করুন
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
