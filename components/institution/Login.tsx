'use client';

import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import { Eye, EyeOff, Phone, ShieldCheck, Mail, ArrowRight, PlayCircle, School, ArrowLeft, Building2, Loader2 } from 'lucide-react';
import { createClient } from '../../utils/supabase/client';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import ShadersBackground from '@/components/ui/background-shades';

// --- SUB-COMPONENTS ---

const GlassInputWrapper = ({ children }: { children: React.ReactNode }) => (
  <div className="rounded-2xl border border-slate-200 bg-slate-50 shadow-sm backdrop-blur-sm transition-all focus-within:border-primary-gold focus-within:bg-white focus-within:shadow-md">
    {children}
  </div>
);

export default function Login() {

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [isSignUp, setIsSignUp] = useState(false);
  const [institutionName, setInstitutionName] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const supabase = createClient();
  const router = useRouter();

  // Cleanup isDemo on mount
  useEffect(() => {
    localStorage.removeItem('isDemo');
    localStorage.removeItem('demoInstName');
  }, []);

  const handleAuth = async () => {
    if (!email || !password) {
      setErrorMsg('Please enter both email and password');
      return;
    }

    if (isSignUp && !institutionName.trim()) {
      setErrorMsg('Please enter the name of the institution');
      return;
    }

    setLoading(true);
    setErrorMsg(null);

    try {
      if (isSignUp) {
        // Create institution record directly with password
        const { data, error } = await supabase
          .from('institutions')
          .insert({
            name: institutionName.trim(),
            email: email.trim(),
            password: password // In production, we should hash this
          })
          .select()
          .single();

        if (error) throw error;
        
        if (data) {
          localStorage.setItem('inst_session', JSON.stringify({
            id: data.id,
            email: data.email,
            name: data.name
          }));
          router.push('/institution/onboarding');
        }
      } else {
        // Check credentials directly in the institutions table
        const { data: user, error } = await supabase
          .from('institutions')
          .select('*')
          .eq('email', email.trim())
          .eq('password', password)
          .maybeSingle();

        if (error) throw error;

        if (!user) {
          throw new Error('Invalid email or password');
        }

        localStorage.setItem('inst_session', JSON.stringify({
          id: user.id,
          email: user.email,
          name: user.name
        }));

        if (user.vision) {
          router.push('/institution/dashboard');
        } else {
          router.push('/institution/onboarding');
        }
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Authentication failed');
    } finally {
      setLoading(false);
    }
  };

  const handleDemoAccess = () => {
    localStorage.setItem('isDemo', 'true');
    localStorage.setItem('demoInstName', 'Demo University');
    router.push('/institution/onboarding');
  };

  return (
    <div className="min-h-screen w-full flex flex-col lg:flex-row relative font-sans overflow-hidden">
      {/* Premium Shader Background */}
      <div className="absolute inset-0 bg-white -z-20"></div>
      <ShadersBackground />
      
      {/* Floating Back Button */}
      <Link 
        href="/" 
        className="fixed top-8 left-8 z-50 flex items-center gap-2 px-6 py-3 bg-white/10 backdrop-blur-xl border border-white/20 rounded-full text-white font-bold hover:bg-white/20 transition-all hover:scale-105 group shadow-2xl"
      >
        <ArrowLeft className="size-4 text-primary group-hover:-translateX-1 transition-transform" />
        <span className="text-sm tracking-widest uppercase">Back to Home</span>
      </Link>

      {/* Left side: Visual Area (Mobile hidden) */}
      <section className="hidden lg:flex flex-1 items-center justify-center p-12 text-white">
        <div className="max-w-md space-y-4 animate-element animate-delay-200">
           <h2 className="text-4xl font-bold font-serif text-slate-900">Elevating Institutional Excellence</h2>
           <p className="text-slate-600 font-medium">Streamlined compliance, powerful analytics, and seamless data management for modern education.</p>
        </div>
      </section>

      {/* Right side: Login Card Section */}
      <section className="flex-1 flex items-center justify-center p-6 lg:p-12 relative z-10">
        <main className="w-full max-w-[480px] bg-white/80 backdrop-blur-xl rounded-[2.5rem] border border-slate-200/60 shadow-[0_32px_64px_-16px_rgba(0,0,0,0.08)] p-8 lg:p-12 animate-element animate-delay-100">

        <div className="flex flex-col gap-10">
          {/* Header & Logo */}
          <div className="flex flex-col gap-6 items-center text-center">
            <div className="animate-element animate-delay-200 flex items-center gap-3">
                 <div className="size-14 bg-white rounded-2xl flex items-center justify-center border border-slate-200 shadow-sm overflow-hidden p-2">
                    <Image 
                      src="/x.png" 
                      alt="C2X Logo" 
                      width={40} 
                      height={40} 
                      className="object-contain"
                    />
                 </div>
                 <div className="text-left">
                     <span className="block text-2xl font-bold tracking-tight text-slate-900 font-serif leading-none">C2X Portal</span>
                     <span className="text-[10px] uppercase font-black tracking-widest text-slate-400">Compliance to Excellence</span>
                 </div>
            </div>

            <div className="space-y-2">
                <h1 className="animate-element animate-delay-300 text-3xl font-bold leading-tight text-slate-900 font-serif">
                    {isSignUp ? "Create Account" : "Welcome Back"}
                </h1>
                <p className="animate-element animate-delay-400 text-slate-500 text-base">
                    {isSignUp ? "Join the network of excellence" : "Secure access to your institutional dashboard"}
                </p>
                {/* Error Message Display */}
                {errorMsg && (
                    <div className="animate-element animate-delay-500 bg-red-50 text-red-600 text-sm p-3 rounded-xl border border-red-100 flex items-center gap-2">
                        <ShieldCheck className="size-4 shrink-0" />
                        {errorMsg}
                    </div>
                )}
            </div>
            
            {/* Toggle Sign In / Sign Up */}
            {!isSignUp ? (
                <div className="flex items-center gap-4 bg-slate-100 p-1.5 rounded-xl w-full">
                    <button 
                        className="flex-1 py-2.5 text-sm font-semibold rounded-lg transition-all bg-white dark:bg-slate-700 text-primary shadow-sm"
                    >
                        Sign In
                    </button>
                    <button 
                        onClick={() => setIsSignUp(true)}
                        className="flex-1 py-2.5 text-sm font-semibold rounded-lg transition-all text-slate-500 hover:text-slate-700 hover:bg-white/50"
                    >
                        Sign Up
                    </button>
                </div>
            ) : (
                <div className="flex items-center gap-4 bg-slate-100 p-1.5 rounded-xl w-full">
                    <button 
                        onClick={() => setIsSignUp(false)}
                        className="flex-1 py-2.5 text-sm font-semibold rounded-lg transition-all text-slate-500 hover:text-slate-700 hover:bg-white/50"
                    >
                        Sign In
                    </button>
                    <button 
                        className="flex-1 py-2.5 text-sm font-semibold rounded-lg transition-all bg-white dark:bg-slate-700 text-primary shadow-sm"
                    >
                        Sign Up
                    </button>
                </div>
            )}
          </div>

          <div className="space-y-6">
            <div className="animate-element animate-delay-400 space-y-4">
                {isSignUp && (
                    <div className="space-y-3">
                        <label className="text-sm font-bold text-slate-700 flex items-center gap-2 px-1">
                            <Building2 className="size-4 text-slate-400" />
                            Institution Name
                        </label>
                        <GlassInputWrapper>
                            <input 
                                className="w-full bg-transparent text-sm p-4 rounded-2xl focus:outline-none text-slate-900 font-medium" 
                                placeholder="e.g. Acme Institute of Technology" 
                                type="text"
                                value={institutionName}
                                onChange={(e) => setInstitutionName(e.target.value)}
                            />
                        </GlassInputWrapper>
                    </div>
                )}
                
                <div className="space-y-3">
                  <label className="text-sm font-bold text-slate-700 flex items-center gap-2 px-1">
                      <Mail className="size-4 text-slate-400" />
                      Email Address
                  </label>
                  <GlassInputWrapper>
                      <input 
                          className="w-full bg-transparent text-sm p-4 rounded-2xl focus:outline-none text-slate-900 font-medium" 
                          placeholder="institution@example.com" 
                          type="email"
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                      />
                  </GlassInputWrapper>
                </div>

                <div className="space-y-3">
                  <label className="text-sm font-bold text-slate-700 flex items-center gap-2 px-1">
                      <ShieldCheck className="size-4 text-slate-400" />
                      Password
                  </label>
                  <GlassInputWrapper>
                    <div className="relative">
                      <input 
                          className="w-full bg-transparent text-sm p-4 rounded-2xl focus:outline-none text-slate-900 font-medium" 
                          placeholder="••••••••" 
                          type={showPassword ? 'text' : 'password'}
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                      />
                      <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute inset-y-0 right-5 flex items-center">
                        {showPassword ? <EyeOff className="w-5 h-5 text-slate-400 hover:text-slate-600 transition-colors" /> : <Eye className="w-5 h-5 text-slate-400 hover:text-slate-600 transition-colors" />}
                      </button>
                    </div>
                  </GlassInputWrapper>
                </div>
            </div>

            <div className="animate-element animate-delay-500 flex items-center justify-between text-sm px-1">
              <label className="flex items-center gap-3 cursor-pointer group">
                <input type="checkbox" className="custom-checkbox" defaultChecked />
                <span className="text-slate-500 font-medium group-hover:text-slate-900 transition-colors">Trust this device</span>
              </label>
              <a href="#" className="text-primary-gold hover:underline font-bold text-xs uppercase tracking-wider">Trouble Logging In?</a>
            </div>

            <button 
              onClick={handleAuth}
              disabled={loading}
              className="animate-element animate-delay-600 w-full py-4 text-sm font-semibold rounded-xl transition-all bg-slate-900 text-white shadow-xl hover:shadow-slate-500/20 active:scale-[0.98] flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                  <Loader2 className="animate-spin size-5" />
              ) : (
                  <>
                      {isSignUp ? "Create Account" : "Sign In"}
                      <ArrowRight className="size-5" />
                  </>
              )}
            </button>
          </div>

          <div className="animate-element animate-delay-700 relative flex items-center justify-center">
            <span className="w-full border-t border-slate-100"></span>
            <span className="px-6 text-xs font-bold uppercase tracking-[0.2em] text-slate-400 bg-white absolute">Restricted Access</span>
          </div>

          <div className="animate-element animate-delay-900 text-center space-y-4">
               <p className="text-[11px] text-slate-400 font-medium leading-relaxed uppercase tracking-wider">
                  Enterprise-grade security • End-to-end encrypted
              </p>
              <div className="flex items-center justify-center gap-6">
                <a href="#" className="text-slate-400 hover:text-primary-gold text-[10px] font-bold uppercase tracking-widest transition-colors">Privacy</a>
                <a href="#" className="text-slate-400 hover:text-primary-gold text-[10px] font-bold uppercase tracking-widest transition-colors">Terms</a>
                <a href="#" className="text-slate-400 hover:text-primary-gold text-[10px] font-bold uppercase tracking-widest transition-colors">Help</a>
              </div>
          </div>
        </div>
      </main>
      </section>
    </div>
  );
}
