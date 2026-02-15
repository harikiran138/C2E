'use client';

import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import { Eye, EyeOff, Mail, ArrowRight, ArrowLeft, Loader2, ShieldCheck, AlertTriangle } from 'lucide-react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import SignUp from './SignUp';
import { motion, AnimatePresence } from 'framer-motion';

const GlassInputWrapper = ({ children }: { children: React.ReactNode }) => (
  <div className="rounded-lg border border-slate-200 bg-slate-50 shadow-sm backdrop-blur-sm transition-all focus-within:border-slate-900 focus-within:bg-white focus-within:shadow-md">
    {children}
  </div>
);

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [isSignUp, setIsSignUp] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  /* Removed Supabase Client */
  const router = useRouter();

  // Removed client-side session check as middleware handles it.
  useEffect(() => {
     localStorage.removeItem('isDemo');
     localStorage.removeItem('demoInstName');
  }, []);

  const handleSignIn = async () => {
    const trimmedEmail = email.trim();
    if (!trimmedEmail || !password) {
      setErrorMsg('Please enter both email and password');
      return;
    }

    setLoading(true);
    setErrorMsg(null);

    try {
      const res = await fetch('/api/institution/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ email: trimmedEmail, password })
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Login failed');
      }

      // Login successful
      // Store session in localStorage for client-side checks if needed
      localStorage.setItem('inst_session', JSON.stringify({
        id: data.id,
        email: trimmedEmail,
        role: 'institution_admin' 
      }));

      // Force refresh to update middleware state
      router.refresh();
      
      // We can optimistically redirect based on the response if it returned status, 
      // but middleware is the source of truth.
      router.push('/institution/dashboard'); 

    } catch (err: any) {
      console.error('Login Error:', err);
      setErrorMsg(err.message || 'Authentication failed. Please check your connection.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full flex flex-col lg:flex-row relative font-sans overflow-y-auto bg-slate-50">
      <div className="login-pattern-bg fixed inset-0 -z-20 opacity-40"></div>
      
      <Link 
        href="/" 
        className="fixed top-8 left-8 z-50 flex items-center gap-2 px-6 py-3 bg-white border border-slate-200 rounded-full text-slate-600 font-semibold hover:bg-slate-50 transition-all hover:scale-105 group shadow-sm"
      >
        <ArrowLeft className="size-4 group-hover:-translateX-1 transition-transform" />
        <span className="text-xs tracking-widest uppercase">Back</span>
      </Link>

      <section className="hidden lg:flex flex-1 items-center justify-center p-12 relative z-10 bg-slate-900">
        <motion.div 
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.6, ease: "easeOut" }}
          className="max-w-2xl space-y-8"
        >
           <h2 className="text-6xl font-semibold font-serif text-white leading-tight">Elevating Institutional Excellence.</h2>
           <p className="text-xl text-slate-400 font-medium">Streamlined compliance, powerful analytics, and seamless data management for modern education.</p>
        </motion.div>
      </section>

      <section className="flex-1 flex items-center justify-center p-6 lg:p-12 relative z-10">
        <motion.main 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="w-full max-w-[480px] bg-white rounded-2xl border border-slate-200 shadow-xl p-8 lg:p-12"
        >
          <div className="flex flex-col gap-8">
            <div className="flex flex-col gap-6 items-center text-center">
              <div className="flex items-center gap-3">
                   <div className="size-12 bg-slate-900 rounded-xl flex items-center justify-center shadow-lg p-2">
                      <Image src="/x.png" alt="C2X Logo" width={32} height={32} className="brightness-0 invert" />
                   </div>
                   <div className="text-left">
                       <span className="block text-xl font-bold tracking-tight text-slate-900 font-serif leading-none">C2X Portal</span>
                       <span className="text-[9px] uppercase font-bold tracking-widest text-slate-400">Compliance to Excellence</span>
                   </div>
              </div>

              <div>
                  <h1 className="text-2xl font-bold text-slate-900 font-serif">
                      {isSignUp ? "Create Account" : "Welcome Back"}
                  </h1>
                  <p className="text-slate-500 text-sm mt-1">
                      {isSignUp ? "Join the network of excellence" : "Secure access to your institutional dashboard"}
                  </p>
              </div>
              
              <div className="relative flex items-center gap-2 bg-slate-100 p-1 rounded-xl w-full">
                  <button 
                      onClick={() => setIsSignUp(false)}
                      className={`relative z-10 flex-1 py-2 text-xs font-bold rounded-lg transition-colors ${!isSignUp ? 'text-slate-900' : 'text-slate-500 hover:text-slate-700'}`}
                  >
                      Sign In
                  </button>
                  <button 
                      onClick={() => setIsSignUp(true)}
                      className={`relative z-10 flex-1 py-2 text-xs font-bold rounded-lg transition-colors ${isSignUp ? 'text-slate-900' : 'text-slate-500 hover:text-slate-700'}`}
                  >
                      Sign Up
                  </button>
                  <motion.div 
                    layoutId="activeTab"
                    className="absolute inset-y-1 bg-white rounded-lg shadow-sm w-[calc(50%-4px)]"
                    initial={false}
                    animate={{
                      x: isSignUp ? 'calc(100% + 4px)' : '0%'
                    }}
                    transition={{ type: "spring", stiffness: 400, damping: 30 }}
                  />
              </div>
            </div>

            <AnimatePresence mode="wait">
              {isSignUp ? (
                <motion.div
                  key="signup"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ duration: 0.3 }}
                >
                  <SignUp />
                </motion.div>
              ) : (
                <motion.div
                  key="signin"
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  transition={{ duration: 0.3 }}
                  className="space-y-6"
                >
                  <div className="space-y-4">
                      <div className="space-y-2">
                        <label className="text-sm font-semibold text-slate-700 flex items-center gap-2 px-1">
                            <Mail className="size-4 text-slate-400" />
                            Email Address
                        </label>
                        <GlassInputWrapper>
                            <input 
                                className="w-full bg-transparent text-sm p-4 rounded-lg focus:outline-none text-slate-900 font-medium" 
                                placeholder="institution@example.com" 
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                            />
                        </GlassInputWrapper>
                      </div>

                      <div className="space-y-2">
                        <label className="text-sm font-semibold text-slate-700 flex items-center gap-2 px-1">
                            <ShieldCheck className="size-4 text-slate-400" />
                            Password
                        </label>
                        <GlassInputWrapper>
                          <div className="relative">
                            <input 
                                className="w-full bg-transparent text-sm p-4 rounded-lg focus:outline-none text-slate-900 font-medium" 
                                placeholder="••••••••" 
                                type={showPassword ? 'text' : 'password'}
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                            />
                            <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute inset-y-0 right-4 flex items-center">
                              {showPassword ? <EyeOff className="size-4 text-slate-400" /> : <Eye className="size-4 text-slate-400" />}
                            </button>
                          </div>
                        </GlassInputWrapper>
                      </div>
                  </div>

                  {errorMsg && (
                      <div className="bg-red-50 text-red-600 text-sm p-4 rounded-xl border border-red-100 flex items-center gap-2">
                          <AlertTriangle className="size-4 shrink-0" />
                          {errorMsg}
                      </div>
                  )}

                  <button 
                    onClick={handleSignIn}
                    disabled={loading}
                    className="w-full py-4 text-sm font-semibold rounded-xl transition-all bg-slate-900 text-white shadow-xl hover:bg-slate-800 active:scale-[0.98] flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {loading ? <Loader2 className="animate-spin size-5" /> : <>Sign In <ArrowRight className="size-5" /></>}
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </motion.main>
      </section>
    </div>
  );
}
