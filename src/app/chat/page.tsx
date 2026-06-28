"use client";

import { useEffect, useState, useRef } from 'react';
import { useAuth } from '@/context/AuthContext';
import { getGroupMessages, getDirectMessages, sendGroupMessage, sendDirectMessage, markMessagesAsRead, markGroupMessagesAsRead } from '@/app/actions/chatActions';
import { getMembers } from '@/app/actions/dataActions';
import { Loader2, Send, Users, ShieldCheck, User as UserIcon } from 'lucide-react';
import { toast } from 'react-hot-toast';

export default function ChatPage() {
  const { mongoUser } = useAuth();
  const [activeTab, setActiveTab] = useState<'Group' | 'Manager'>('Group');
  
  // Group Chat State
  const [groupMessages, setGroupMessages] = useState<any[]>([]);
  const [groupInput, setGroupInput] = useState('');
  
  // Direct Chat State
  const [managerMessages, setManagerMessages] = useState<any[]>([]);
  const [managerInput, setManagerInput] = useState('');
  const [allMembers, setAllMembers] = useState<any[]>([]);
  const [selectedMemberId, setSelectedMemberId] = useState<string | null>(null);

  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (mongoUser) {
      fetchData();
      
      // Polling for real-time updates every 3 seconds
      const interval = setInterval(fetchMessagesBackground, 3000);
      return () => clearInterval(interval);
    }
  }, [mongoUser]);

  useEffect(() => {
    // Scroll to bottom on new messages
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    
    // Mark as read when opening chat
    if (activeTab === 'Manager' && selectedMemberId && mongoUser) {
       markMessagesAsRead(mongoUser._id, selectedMemberId);
       // Proactively update local state
       setManagerMessages(prev => prev.map(m => {
         if (m.senderId?._id === selectedMemberId && m.receiverId?._id === mongoUser._id) {
           return { ...m, isRead: true };
         }
         return m;
       }));
    } else if (activeTab === 'Group' && mongoUser) {
       markGroupMessagesAsRead(mongoUser._id);
    }
  }, [groupMessages, managerMessages.length, activeTab, selectedMemberId, mongoUser]);

  async function fetchMessagesBackground() {
    try {
      const [groupRes, managerRes] = await Promise.all([
        getGroupMessages(),
        getDirectMessages(mongoUser._id)
      ]);
      if (groupRes.success) setGroupMessages(groupRes.messages);
      if (managerRes.success) setManagerMessages(managerRes.messages);
      
      if (activeTab === 'Manager' && selectedMemberId && mongoUser) {
        markMessagesAsRead(mongoUser._id, selectedMemberId);
      } else if (activeTab === 'Group' && mongoUser) {
        markGroupMessagesAsRead(mongoUser._id);
      }
    } catch (error) {
      // Background error ignored
    }
  }

  async function fetchData() {
    try {
      setLoading(true);
      const [groupRes, managerRes, membersRes] = await Promise.all([
        getGroupMessages(),
        getDirectMessages(mongoUser._id),
        getMembers()
      ]);

      if (groupRes.success) setGroupMessages(groupRes.messages);
      if (managerRes.success) {
        setManagerMessages(managerRes.messages);
      }
      if (membersRes.success && membersRes.users) {
        setAllMembers(membersRes.users.filter((m: any) => m._id !== mongoUser._id));
      }
    } catch (error) {
      console.error("Error fetching chat data:", error);
    } finally {
      setLoading(false);
    }
  }

  const handleSendGroup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!groupInput.trim()) return;
    
    setSending(true);
    const res = await sendGroupMessage(mongoUser._id, groupInput);
    if (res.success) {
      setGroupMessages(prev => [...prev, res.message]);
      setGroupInput('');
    } else {
      toast.error("ম্যাসেজ পাঠাতে সমস্যা হয়েছে!");
    }
    setSending(false);
  };

  const handleSendManager = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!managerInput.trim()) return;
    
    if (!selectedMemberId) {
      toast.error("মেসেজ করার জন্য একজন মেম্বার সিলেক্ট করুন।");
      return;
    }

    setSending(true);
    const res = await sendDirectMessage(mongoUser._id, selectedMemberId, managerInput);
    if (res.success) {
      setManagerMessages(prev => [...prev, res.message]);
      setManagerInput('');
    } else {
      toast.error("ম্যাসেজ পাঠাতে সমস্যা হয়েছে!");
    }
    setSending(false);
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-[60vh]">
        <Loader2 className="w-10 h-10 animate-spin text-blue-500" />
      </div>
    );
  }

  const renderMessage = (msg: any) => {
    const isMe = msg.senderId?._id === mongoUser._id;
    return (
      <div key={msg._id} className={`flex w-full mb-4 ${isMe ? 'justify-end' : 'justify-start'}`}>
        <div className={`flex max-w-[75%] ${isMe ? 'flex-row-reverse' : 'flex-row'} gap-3 items-end`}>
          <div className="w-8 h-8 rounded-full bg-gray-200 flex-shrink-0 overflow-hidden">
             {msg.senderId?.photoURL ? (
                <img src={msg.senderId.photoURL} alt="Profile" className="w-full h-full object-cover" />
             ) : (
                <div className="w-full h-full flex items-center justify-center bg-blue-100 text-blue-600 font-bold text-xs">
                  {msg.senderId?.name?.charAt(0).toUpperCase()}
                </div>
             )}
          </div>
          <div className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
            <span className="text-xs text-gray-500 mb-1 px-1">
              {isMe ? 'আপনি' : msg.senderId?.name}
              {msg.senderId?.role === 'Manager' || msg.senderId?.role === 'Super Admin' ? (
                <span className="ml-1 text-[10px] bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded-md font-bold">Admin</span>
              ) : null}
            </span>
            <div className={`px-4 py-2 rounded-2xl text-sm ${isMe ? 'bg-blue-600 text-white rounded-br-none' : 'bg-white border border-gray-100 text-gray-800 rounded-bl-none shadow-sm'}`}>
              {msg.message}
            </div>
          </div>
        </div>
      </div>
    );
  };

  // Filter direct messages for selected member
  const filteredManagerMessages = selectedMemberId
    ? managerMessages.filter(m => m.senderId?._id === selectedMemberId || m.receiverId?._id === selectedMemberId)
    : [];

  const getUnreadCountForMember = (memberId: string) => {
    return managerMessages.filter(m => m.senderId?._id === memberId && m.receiverId?._id === mongoUser?._id && m.isRead !== true).length;
  };

  return (
    <div className="w-full max-w-5xl mx-auto h-[calc(100vh-100px)] flex flex-col mt-4">
      {/* Tabs */}
      <div className="flex bg-white rounded-3xl p-2 shadow-sm border border-gray-100 mb-4 shrink-0">
        <button
          onClick={() => setActiveTab('Group')}
          className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-2xl font-bold transition-colors ${activeTab === 'Group' ? 'bg-blue-50 text-blue-700' : 'text-gray-500 hover:bg-gray-50'}`}
        >
          <Users className="w-5 h-5" /> মেস গ্রুপ চ্যাট
        </button>
        <button
          onClick={() => setActiveTab('Manager')}
          className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-2xl font-bold transition-colors ${activeTab === 'Manager' ? 'bg-emerald-50 text-emerald-700' : 'text-gray-500 hover:bg-gray-50'}`}
        >
          <ShieldCheck className="w-5 h-5" /> ব্যক্তিগত চ্যাট
        </button>
      </div>

      <div className="flex-1 bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden flex">
        
        {/* If Direct Chat, show sidebar with members */}
        {activeTab === 'Manager' && (
          <div className="w-1/3 border-r border-gray-100 flex flex-col bg-gray-50/30">
            <div className="p-4 border-b border-gray-100 font-bold text-gray-700 flex items-center gap-2">
               মেম্বার তালিকা
            </div>
            <div className="flex-1 overflow-y-auto p-2 space-y-1">
              {allMembers.map(member => {
                const unreadCount = getUnreadCountForMember(member._id);
                return (
                <button
                  key={member._id}
                  onClick={() => setSelectedMemberId(member._id)}
                  className={`w-full text-left px-4 py-3 rounded-xl transition-colors font-medium text-sm flex items-center justify-between gap-3 ${selectedMemberId === member._id ? 'bg-blue-100 text-blue-700' : 'text-gray-700 hover:bg-gray-100'}`}
                >
                  <div className="flex items-center gap-3 overflow-hidden">
                    <div className="w-8 h-8 rounded-full bg-white flex items-center justify-center font-bold text-gray-500 border border-gray-200 shrink-0">
                      {member.name.charAt(0)}
                    </div>
                    <div className="flex-1 overflow-hidden text-ellipsis whitespace-nowrap">
                      {member.name}
                    </div>
                  </div>
                  {unreadCount > 0 && (
                    <span className="bg-rose-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0">
                      {unreadCount}
                    </span>
                  )}
                </button>
              )})}
            </div>
          </div>
        )}

        {/* Chat Area */}
        <div className="flex-1 flex flex-col bg-gray-50/50 relative">
          
          {activeTab === 'Manager' && !selectedMemberId ? (
            <div className="flex-1 flex items-center justify-center text-gray-400 font-medium flex-col gap-2">
              <ShieldCheck className="w-12 h-12 opacity-20" />
              <p>চ্যাট শুরু করতে একজন মেম্বার নির্বাচন করুন</p>
            </div>
          ) : (
            <>
              {/* Messages List */}
              <div className="flex-1 overflow-y-auto p-6">
                {activeTab === 'Group' && groupMessages.map(renderMessage)}
                {activeTab === 'Group' && groupMessages.length === 0 && (
                  <div className="text-center text-gray-400 mt-10">কোনো মেসেজ নেই। প্রথম মেসেজটি পাঠান!</div>
                )}

                {activeTab === 'Manager' && filteredManagerMessages.map(renderMessage)}
                {activeTab === 'Manager' && filteredManagerMessages.length === 0 && (
                  <div className="text-center text-gray-400 mt-10">
                    এই মেম্বারের সাথে কোনো চ্যাট নেই।
                  </div>
                )}
                <div ref={chatEndRef} />
              </div>

              {/* Input Area */}
              <div className="p-4 bg-white border-t border-gray-100">
                <form 
                  onSubmit={activeTab === 'Group' ? handleSendGroup : handleSendManager}
                  className="flex items-center gap-2"
                >
                  <input 
                    type="text"
                    value={activeTab === 'Group' ? groupInput : managerInput}
                    onChange={e => activeTab === 'Group' ? setGroupInput(e.target.value) : setManagerInput(e.target.value)}
                    placeholder="মেসেজ লিখুন..."
                    className="flex-1 px-4 py-3 bg-gray-50 border border-gray-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition-all text-sm"
                  />
                  <button 
                    type="submit"
                    disabled={sending || (activeTab === 'Manager' && !selectedMemberId)}
                    className="p-3 bg-blue-600 text-white rounded-2xl hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {sending ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5 ml-1" />}
                  </button>
                </form>
              </div>
            </>
          )}

        </div>
      </div>
    </div>
  );
}
