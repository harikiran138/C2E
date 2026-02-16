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
    <div className="min-h-screen w-full flex flex-col lg:flex-row relative font-sans overflow-y-auto bg-background selection:bg-primary/20">
      <div className="login-pattern-bg fixed inset-0 -z-20 opacity-20"></div>
      <div className="absolute inset-0 bg-gradient-to-tr from-background via-background/80 to-transparent -z-10" />
      
      <Link 
        href="/" 
        className="fixed top-8 left-8 z-50 flex items-center gap-2 px-6 py-3 bg-card/40 border border-border/40 backdrop-blur-xl rounded-full text-foreground font-semibold hover:bg-card/60 transition-all hover:scale-105 group shadow-xl"
      >
        <ArrowLeft className="size-4 group-hover:-translateX-1 transition-transform" />
        <span className="text-xs tracking-widest uppercase">Back</span>
      </Link>

      <section className="hidden lg:flex flex-1 items-center justify-center p-12 relative z-10 bg-sidebar/40 backdrop-blur-2xl border-r border-border/40">
        <motion.div 
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.6, ease: "easeOut" }}
          className="max-w-xl space-y-8"
        >
           <div className="size-20 rounded-2xl bg-primary flex items-center justify-center text-primary-foreground shadow-2xl shadow-primary/20 font-black italic text-4xl mb-12">C</div>
           <h2 className="text-6xl font-extrabold tracking-tight text-foreground leading-[1.1]">Elevating Institutional <span className="text-primary italic">Excellence.</span></h2>
           <p className="text-xl text-muted-foreground font-medium max-w-md">Streamlined compliance, powerful analytics, and seamless data management for modern education.</p>
           
           <div className="flex items-center gap-4 pt-8">
                <div className="flex -space-x-3">
                    {[1,2,3,4].map(i => (
                        <div key={i} className="size-10 rounded-full border-2 border-background bg-muted flex items-center justify-center text-[10px] font-bold">U{i}</div>
                    ))}
                </div>
                <p className="text-sm font-medium text-muted-foreground">Trusted by 500+ Institutions</p>
           </div>
        </motion.div>
      </section>

      <section className="flex-1 flex items-center justify-center p-6 lg:p-12 relative z-10">
        <motion.main 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="w-full max-w-[480px] bg-card/40 backdrop-blur-3xl rounded-[2.5rem] border border-border/40 shadow-2xl p-8 lg:p-12 relative overflow-hidden"
        >
          <div className="absolute inset-x-0 -top-px h-px bg-gradient-to-r from-transparent via-primary/50 to-transparent" />
          
          <div className="flex flex-col gap-8 relative">
            <div className="flex flex-col gap-6 items-center text-center">
              <div className="flex items-center gap-3 lg:hidden">
                   <div className="size-12 bg-primary rounded-xl flex items-center justify-center shadow-lg p-2">
                      <Image src="/x.png" alt="C2X Logo" width={32} height={32} className="brightness-0 invert" />
                   </div>
                   <div className="text-left">
                       <span className="block text-xl font-bold tracking-tight text-foreground leading-none">C2X Portal</span>
                       <span className="text-[9px] uppercase font-bold tracking-widest text-muted-foreground">Compliance to Excellence</span>
                   </div>
              </div>

              <div>
                  <h1 className="text-3xl font-bold text-foreground tracking-tight">
                      {isSignUp ? "Create Account" : "Welcome Back"}
                  </h1>
                  <p className="text-muted-foreground text-sm mt-2">
                      {isSignUp ? "Join the network of excellence" : "Secure access to your institutional dashboard"}
                  </p>
              </div>
              
              <div className="relative flex items-center gap-2 bg-muted/50 p-1 rounded-2xl w-full border border-border/20">
                  <button 
                      onClick={() => setIsSignUp(false)}
                      className={`relative z-10 flex-1 py-2.5 text-xs font-bold rounded-xl transition-all ${!isSignUp ? 'text-primary-foreground' : 'text-muted-foreground hover:text-foreground'}`}
                  >
                      Sign In
                  </button>
                  <button 
                      onClick={() => setIsSignUp(true)}
                      className={`relative z-10 flex-1 py-2.5 text-xs font-bold rounded-xl transition-all ${isSignUp ? 'text-primary-foreground' : 'text-muted-foreground hover:text-foreground'}`}
                  >
                      Sign Up
                  </button>
                  <motion.div 
                    layoutId="activeTab"
                    className="absolute inset-y-1 bg-primary rounded-xl shadow-lg w-[calc(50%-4px)]"
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
                        <label className="text-xs font-bold uppercase tracking-[0.1em] text-muted-foreground flex items-center gap-2 px-1">
                            <Mail className="size-3.5" />
                            Email Address
                        </label>
                        <div className="rounded-xl border border-border/60 bg-background/50 backdrop-blur-sm transition-all focus-within:border-primary/50 focus-within:ring-4 focus-within:ring-primary/10 overflow-hidden">
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
                        <div className="rounded-xl border border-border/60 bg-background/50 backdrop-blur-sm transition-all focus-within:border-primary/50 focus-within:ring-4 focus-within:ring-primary/10 overflow-hidden">
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
                      <div className="bg-destructive/10 text-destructive text-sm p-4 rounded-xl border border-destructive/20 flex items-center gap-2">
                          <AlertTriangle className="size-4 shrink-0" />
                          {errorMsg}
                      </div>
                  )}

                  <button 
                    onClick={handleSignIn}
                    disabled={loading}
                    className="w-full py-4 text-sm font-bold rounded-xl transition-all bg-primary text-primary-foreground shadow-xl shadow-primary/20 hover:bg-primary/90 hover:scale-[1.02] active:scale-[0.98] flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed group"
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
  );
}
