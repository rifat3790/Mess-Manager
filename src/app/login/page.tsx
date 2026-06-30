"use client";

import { useState, useEffect } from 'react';
import { signInWithEmailAndPassword, signInWithPopup, sendPasswordResetEmail } from 'firebase/auth';
import { auth, googleProvider } from '@/lib/firebase';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import { toast } from 'react-hot-toast';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [isForgotMode, setIsForgotMode] = useState(false);
  
  const router = useRouter();
  const { user, mongoUser, loading: authLoading, messName } = useAuth();

  // Redirect if already logged in
  useEffect(() => {
    if (!authLoading && user && mongoUser && mongoUser.role !== 'Pending') {
      router.push('/');
    }
  }, [user, mongoUser, authLoading, router]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      await signInWithEmailAndPassword(auth, email, password);
      router.push('/');
    } catch (err: any) {
      setError(err.message || 'Failed to login');
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) {
      setError("অনুগ্রহ করে আপনার ইমেইল এড্রেসটি দিন।");
      return;
    }

    setLoading(true);
    setError('');
    setMessage('');

    try {
      await sendPasswordResetEmail(auth, email);
      setMessage("পাসওয়ার্ড রিসেটের লিংক আপনার ইমেইলে পাঠানো হয়েছে। অনুগ্রহ করে চেক করুন!");
      toast.success("পাসওয়ার্ড রিসেট লিংক পাঠানো হয়েছে!");
    } catch (err: any) {
      setError(err.message || 'Failed to send reset email');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setLoading(true);
    setError('');
    try {
      const result = await signInWithPopup(auth, googleProvider);
      const user = result.user;
      
      await fetch('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          firebaseUid: user.uid,
          name: user.displayName || 'Google User',
          email: user.email,
        }),
      }).catch(e => console.log('User might already exist:', e));
      
      router.push('/');
    } catch (err: any) {
      setError(err.message || 'Google sign-in failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div suppressHydrationWarning className="flex justify-center items-center h-full min-h-[80vh] w-full p-4">
      <div className="w-full max-w-md bg-white rounded-3xl shadow-xl border border-gray-100 overflow-hidden">
        <div className="text-center pt-8 mb-4">
          <div className="w-16 h-16 bg-gradient-to-br from-indigo-500 to-indigo-600 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg shadow-indigo-500/20 font-bold text-3xl text-white">
            {messName?.charAt(0) || 'M'}
          </div>
          <h2 className="text-2xl font-black text-gray-900 tracking-tight">{messName || 'Mohakhali Mess'}</h2>
          <p className="text-gray-500 mt-1 text-sm">
            {isForgotMode ? 'পাসওয়ার্ড ভুলে গেছেন?' : 'মেস ড্যাশবোর্ডে লগইন করুন'}
          </p>
        </div>

        <div className="p-8 pt-4">
          {error && <div className="bg-rose-50 border border-rose-100 text-rose-600 p-3.5 rounded-xl text-sm mb-4 font-bold">{error}</div>}
          {message && <div className="bg-emerald-50 border border-emerald-100 text-emerald-600 p-3.5 rounded-xl text-sm mb-4 font-bold">{message}</div>}
          
          {isForgotMode ? (
            /* Forgot Password Flow */
            <form onSubmit={handleForgotPassword} className="space-y-5">
              <div>
                <label className="block text-xs font-bold text-gray-500 mb-1.5 uppercase tracking-wider">ইমেইল এড্রেস</label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all outline-none font-medium text-sm"
                  placeholder="আপনার ইমেইল দিন"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold transition-all shadow-md shadow-indigo-200 disabled:opacity-70 text-sm"
              >
                {loading ? 'পাঠানো হচ্ছে...' : 'পাসওয়ার্ড রিসেট লিংক পাঠান'}
              </button>

              <button
                type="button"
                onClick={() => { setIsForgotMode(false); setError(''); setMessage(''); }}
                className="w-full text-center text-indigo-600 hover:underline text-xs font-bold pt-2 block"
              >
                লগইন পেজে ফিরে যান
              </button>
            </form>
          ) : (
            /* Login Flow */
            <>
              <form onSubmit={handleLogin} className="space-y-5">
                <div>
                  <label className="block text-xs font-bold text-gray-500 mb-1.5 uppercase tracking-wider">ইমেইল এড্রেস</label>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all outline-none font-medium text-sm"
                    placeholder="আপনার ইমেইল দিন"
                  />
                </div>
                <div>
                  <div className="flex justify-between items-center mb-1.5">
                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider">পাসওয়ার্ড</label>
                    <button
                      type="button"
                      onClick={() => { setIsForgotMode(true); setError(''); setMessage(''); }}
                      className="text-xs text-indigo-600 font-bold hover:underline"
                    >
                      পাসওয়ার্ড ভুলে গেছেন?
                    </button>
                  </div>
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all outline-none font-medium text-sm"
                    placeholder="পাসওয়ার্ড দিন"
                  />
                </div>
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold transition-all shadow-md shadow-indigo-200 disabled:opacity-70 text-sm"
                >
                  {loading ? 'লগইন হচ্ছে...' : 'লগইন করুন'}
                </button>
              </form>
              
              <div className="mt-6 flex items-center justify-between">
                <hr className="w-full border-gray-100" />
                <span className="px-3 text-gray-400 text-xs font-bold uppercase tracking-widest">অথবা</span>
                <hr className="w-full border-gray-100" />
              </div>
              
              <button
                onClick={handleGoogleSignIn}
                disabled={loading}
                className="mt-5 flex items-center justify-center gap-3 w-full py-3 bg-white border border-gray-200 hover:bg-gray-50 text-gray-700 rounded-xl font-bold transition-colors shadow-sm disabled:opacity-70 text-sm"
              >
                <svg viewBox="0 0 24 24" width="20" height="20" xmlns="http://www.w3.org/2000/svg">
                  <g transform="matrix(1, 0, 0, 1, 27.009001, -39.238998)">
                    <path fill="#4285F4" d="M -3.264 51.509 C -3.264 50.719 -3.334 49.969 -3.454 49.239 L -14.754 49.239 L -14.754 53.749 L -8.284 53.749 C -8.574 55.229 -9.424 56.479 -10.684 57.329 L -10.684 60.329 L -6.824 60.329 C -4.564 58.239 -3.264 55.159 -3.264 51.509 Z"/>
                    <path fill="#34A853" d="M -14.754 63.239 C -11.514 63.239 -8.804 62.159 -6.824 60.329 L -10.684 57.329 C -11.764 58.049 -13.134 58.489 -14.754 58.489 C -17.884 58.489 -20.534 56.379 -21.484 53.529 L -25.464 53.529 L -25.464 56.619 C -23.494 60.539 -19.444 63.239 -14.754 63.239 Z"/>
                    <path fill="#FBBC05" d="M -21.484 53.529 C -21.734 52.809 -21.864 52.039 -21.864 51.239 C -21.864 50.439 -21.724 49.669 -21.484 48.949 L -21.484 45.859 L -25.464 45.859 C -26.284 47.479 -26.754 49.299 -26.754 51.239 C -26.754 53.179 -26.284 54.999 -25.464 56.619 L -21.484 53.529 Z"/>
                    <path fill="#EA4335" d="M -14.754 43.989 C -12.984 43.989 -11.404 44.599 -10.154 45.789 L -6.734 42.369 C -8.804 40.429 -11.514 39.239 -14.754 39.239 C -19.444 39.239 -23.494 41.939 -25.464 45.859 L -21.484 48.949 C -20.534 46.099 -17.884 43.989 -14.754 43.989 Z"/>
                  </g>
                </svg>
                Google দিয়ে সাইন ইন করুন
              </button>

              <p className="mt-6 text-center text-gray-500 text-xs font-bold">
                অ্যাকাউন্ট নেই? <Link href="/register" className="text-indigo-600 font-extrabold hover:underline">নতুন অ্যাকাউন্ট খুলুন</Link>
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
