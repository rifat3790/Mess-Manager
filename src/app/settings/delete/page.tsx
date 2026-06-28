"use client";

import { useAuth } from '@/context/AuthContext';
import { Trash2, Loader2, AlertTriangle } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { wipeDatabase } from '@/app/actions/adminActions';

export default function DeleteMessPage() {
  const { mongoUser, loading: authLoading } = useAuth();
  const router = useRouter();
  
  const [code, setCode] = useState("");
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (!authLoading && (!mongoUser || mongoUser.role !== 'Super Admin')) {
      router.push('/');
    }
  }, [mongoUser, authLoading, router]);

  const handleDelete = async () => {
    if (code !== 'DELETE MESS') {
      alert("সঠিক কনফার্মেশন কোড লিখুন!");
      return;
    }
    
    if (confirm("আপনি কি নিশ্চিত? এই কাজটি আর ফেরানো যাবে না। সব মেম্বার এবং হিসেব মুছে যাবে!")) {
      setDeleting(true);
      const res = await wipeDatabase(code);
      setDeleting(false);
      
      if (res.success) {
        alert("মেস সফলভাবে ডিলিট করা হয়েছে! সব হিসেব মুছে গেছে।");
        router.push('/');
      } else {
        alert("ডিলিট করতে সমস্যা হয়েছে: " + res.error);
      }
    }
  };

  if (authLoading) {
    return (
      <div className="flex justify-center items-center min-h-[60vh]">
        <Loader2 className="w-10 h-10 animate-spin text-blue-500" />
      </div>
    );
  }

  if (mongoUser?.role !== 'Super Admin') return null;

  return (
    <div className="w-full space-y-6 mt-4">
      <div className="bg-red-50 p-8 rounded-3xl shadow-sm border border-red-100 flex items-center gap-4">
        <div className="w-14 h-14 bg-red-100 text-red-600 rounded-2xl flex items-center justify-center">
          <Trash2 className="w-7 h-7" />
        </div>
        <div>
          <h2 className="text-2xl font-bold text-red-900">মেস ডিলিট (ডেঞ্জার জোন)</h2>
          <p className="text-red-700 mt-1">সব হিসাব এবং মেম্বার পার্মানেন্টলি ডিলিট করুন</p>
        </div>
      </div>

      <div className="bg-white rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-red-200 overflow-hidden max-w-2xl mx-auto mt-10 relative">
        <div className="absolute top-0 left-0 w-full h-1 bg-red-500"></div>
        <div className="p-10 text-center">
           <AlertTriangle className="w-20 h-20 text-red-500 mx-auto mb-6" />
           <h3 className="text-2xl font-black text-gray-900 mb-4">সতর্কতা!</h3>
           <p className="text-gray-600 mb-8 leading-relaxed">
             আপনি যদি মেস ডিলিট করেন, তবে মেসের <b>সকল হিসাব (মিল, জমা, খরচ), সকল রানিং মাস এবং সকল মেম্বার (সুপার অ্যাডমিন ছাড়া)</b> মুছে যাবে। এই কাজটি আর আনডু (Undo) করা যাবে না!
           </p>
           
           <div className="bg-red-50 p-6 rounded-2xl border border-red-100 text-left mb-8">
             <label className="block text-sm font-bold text-red-900 mb-3">ডিলিট করতে নিচের বক্সে <span className="text-red-600 font-mono bg-white px-2 py-1 rounded border border-red-200">DELETE MESS</span> হুবহু লিখুন:</label>
             <input 
               type="text" 
               value={code}
               onChange={(e) => setCode(e.target.value)}
               placeholder="DELETE MESS"
               className="w-full px-4 py-3 bg-white border border-red-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-500 font-mono font-bold text-center uppercase tracking-widest text-red-700 placeholder:text-red-300"
             />
           </div>

           <button 
             onClick={handleDelete}
             disabled={deleting || code !== 'DELETE MESS'}
             className="w-full py-4 bg-red-600 hover:bg-red-700 disabled:bg-gray-300 disabled:text-gray-500 disabled:cursor-not-allowed text-white rounded-xl font-black text-lg transition-colors flex items-center justify-center gap-3 shadow-lg shadow-red-200"
           >
             {deleting ? <Loader2 className="w-6 h-6 animate-spin" /> : <Trash2 className="w-6 h-6" />}
             {deleting ? "ডিলিট হচ্ছে..." : "স্থায়ীভাবে মেস ডিলিট করুন"}
           </button>
        </div>
      </div>
    </div>
  );
}
