'use client';

import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import { Eye, EyeOff, Mail, ArrowRight, ArrowLeft, Loader2, ShieldCheck, AlertTriangle } from 'lucide-react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import SignUp from './SignUp';
import { motion, AnimatePresence } from 'framer-motion';

import AuthBackground from '../ui/AuthBackground';

const GlassInputWrapper = ({ children }: { children: React.ReactNode }) => (
  <div className="rounded-md border border-slate-200 bg-slate-50 shadow-sm backdrop-blur-sm transition-all focus-within:border-slate-900 focus-within:bg-white focus-within:shadow-md">
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

      // Clear stale onboarding progress
      localStorage.removeItem('onboarding_data');
      localStorage.removeItem('onboarding_step');

      // Force a hard reload to the dashboard to ensure middleware and state are fresh
      window.location.href = '/institution/dashboard'; 

    } catch (err: any) {
      console.error('Login Error:', err);
      setErrorMsg(err.message || 'Authentication failed. Please check your connection.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthBackground className="flex-row items-stretch justify-start !p-0">
      <div className="flex-1 flex flex-col lg:flex-row relative font-sans w-full h-full overflow-hidden selection:bg-primary/20">
        <Link 
          href="/" 
          className="fixed top-8 left-8 z-50 flex items-center gap-2 px-6 py-3 bg-card/40 border border-border/40 backdrop-blur-xl rounded-full text-foreground font-semibold hover:bg-card/60 transition-all hover:scale-105 group shadow-xl"
        >
          <ArrowLeft className="size-4 group-hover:-translateX-1 transition-transform" />
          <span className="text-xs tracking-widest uppercase">Back</span>
        </Link>


        {/* Spacer for Left Side (Pattern Visible) */}
        <section className="hidden lg:block flex-1 relative z-10" />

        {/* Right Side Content */}
        <section className="flex-1 flex items-center justify-center p-6 lg:p-12 relative z-10 h-full overflow-y-auto">
          <motion.main 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ 
              duration: 0.4,
              layout: { type: "spring", stiffness: 200, damping: 25 }
            }}
            layout="size"
            className="w-full max-w-[480px] bg-card/40 backdrop-blur-3xl rounded-3xl border border-border/40 shadow-2xl p-8 lg:p-12 relative overflow-hidden"
          >
            <div className="absolute inset-x-0 -top-px h-px bg-gradient-to-r from-transparent via-primary/50 to-transparent" />
            
            <div className="flex flex-col gap-6 relative">
              <div className="flex flex-col gap-4 items-center text-center">
                <div className="flex flex-col items-center gap-3 mb-1">
                     <div className="size-14 bg-primary rounded-xl flex items-center justify-center shadow-2xl shadow-primary/20 p-3">
                        <Image src="/C2XPlus.jpeg" alt="C2X Logo" width={48} height={48} className="object-contain rounded-lg" />
                     </div>
                     <div className="text-center space-y-0.5">
                         <span className="block text-xl font-black tracking-tight text-foreground leading-none">C2X Plus+</span>
                         <span className="text-[9px] uppercase font-bold tracking-[0.2em] text-muted-foreground block">Compliance to Excellence</span>
                     </div>
                </div>

                <div className="mb-2">
                    <h1 className="text-2xl font-bold text-foreground tracking-tight">
                        {isSignUp ? "Create Account" : "Welcome Back"}
                    </h1>
                </div>
                
                <div className="relative flex items-center gap-2 bg-muted/50 p-1 rounded-xl w-full border border-border/20">
                    <button 
                        onClick={() => setIsSignUp(false)}
                        className={`relative z-10 flex-1 py-2.5 text-xs font-bold rounded-lg transition-all ${!isSignUp ? 'text-primary-foreground' : 'text-muted-foreground hover:text-foreground'}`}
                    >
                        Sign In
                    </button>
                    <button 
                        onClick={() => setIsSignUp(true)}
                        className={`relative z-10 flex-1 py-2.5 text-xs font-bold rounded-lg transition-all ${isSignUp ? 'text-primary-foreground' : 'text-muted-foreground hover:text-foreground'}`}
                    >
                        Sign Up
                    </button>
                    <motion.div 
                      layoutId="activeTab"
                      className="absolute inset-y-1 bg-primary rounded-lg shadow-lg w-[calc(50%-4px)]"
                      initial={false}
                      animate={{
                        x: isSignUp ? 'calc(100% + 4px)' : '0%'
                      }}
                      transition={{ type: "spring", stiffness: 300, damping: 25 }}
                    />
                </div>
              </div>

              <AnimatePresence mode="wait" initial={false}>
                {isSignUp ? (
                  <motion.div
                    key="signup"
                    layout
                    initial={{ opacity: 0, y: 15 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -15 }}
                    transition={{ type: "spring", stiffness: 260, damping: 20 }}
                  >
                    <SignUp />
                  </motion.div>
                ) : (
                  <motion.div
                    key="signin"
                    layout
                    initial={{ opacity: 0, y: 15 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -15 }}
                    transition={{ type: "spring", stiffness: 260, damping: 20 }}
                    className="space-y-4"
                  >
                    <div className="space-y-3">
                        <div className="space-y-2">
                          <label className="text-xs font-bold uppercase tracking-[0.1em] text-muted-foreground flex items-center gap-2 px-1">
                              <Mail className="size-3.5" />
                              Email Address
                          </label>
                          <div className="rounded-lg border border-border/60 bg-background/50 backdrop-blur-sm transition-all focus-within:border-primary/50 focus-within:ring-4 focus-within:ring-primary/10 overflow-hidden">
                              <input 
                                  className="w-full bg-transparent text-sm p-4 focus:outline-none text-foreground font-medium placeholder:text-muted-foreground/50" 
                                  placeholder="institution@example.com" 
                                  type="email"
                                  value={email}
                                  onChange={(e) => setEmail(e.target.value)}
                              />
                          </div>
                        </div>

                        <div className="space-y-2">
                          <label className="text-xs font-bold uppercase tracking-[0.1em] text-muted-foreground flex items-center gap-2 px-1">
                              <ShieldCheck className="size-3.5" />
                              Password
                          </label>
                          <div className="rounded-lg border border-border/60 bg-background/50 backdrop-blur-sm transition-all focus-within:border-primary/50 focus-within:ring-4 focus-within:ring-primary/10 overflow-hidden">
                            <div className="relative">
                              <input 
                                  className="w-full bg-transparent text-sm p-4 focus:outline-none text-foreground font-medium placeholder:text-muted-foreground/50" 
                                  placeholder="••••••••" 
                                  type={showPassword ? 'text' : 'password'}
                                  value={password}
                                  onChange={(e) => setPassword(e.target.value)}
                              />
                              <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute inset-y-0 right-4 flex items-center">
                                {showPassword ? <EyeOff className="size-4 text-muted-foreground" /> : <Eye className="size-4 text-muted-foreground" />}
                              </button>
                            </div>
                          </div>
                        </div>
                    </div>

                    {errorMsg && (
                        <div className="bg-destructive/10 text-destructive text-sm p-4 rounded-lg border border-destructive/20 flex items-center gap-2">
                            <AlertTriangle className="size-4 shrink-0" />
                            {errorMsg}
                        </div>
                    )}

                    <button 
                      onClick={handleSignIn}
                      disabled={loading}
                      className="w-full py-4 text-sm font-bold rounded-lg transition-all bg-primary text-primary-foreground shadow-xl shadow-primary/20 hover:bg-primary/90 hover:scale-[1.02] active:scale-[0.98] flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed group"
                    >
                      {loading ? <Loader2 className="animate-spin size-5" /> : <>Sign In <ArrowRight className="size-5 group-hover:translate-x-1 transition-transform" /></>}
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </motion.main>
        </section>
      </div>
    </AuthBackground>
  );
}
