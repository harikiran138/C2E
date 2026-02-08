'use client';

import React, { useState, useEffect } from 'react';
import { Eye, EyeOff, Phone, ShieldCheck, Mail, ArrowRight, PlayCircle, School } from 'lucide-react';
import { createClient } from '../../utils/supabase/client';
import { useRouter } from 'next/navigation';
import ShadersBackground from '@/components/ui/background-shades';

// --- SUB-COMPONENTS ---

const GlassInputWrapper = ({ children }: { children: React.ReactNode }) => (
  <div className="rounded-2xl border border-slate-200 bg-slate-50 shadow-sm backdrop-blur-sm transition-all focus-within:border-primary-gold focus-within:bg-white focus-within:shadow-md">
    {children}
  </div>
);

export default function InstitutionLogin() {
  const [mobile, setMobile] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);
  const [countryCode, setCountryCode] = useState('+91');
  const [showOtp, setShowOtp] = useState(false);

  const supabase = createClient();
  const router = useRouter();

  useEffect(() => {
    localStorage.removeItem('isDemo');
  }, []);

  const handleSendOtp = async () => {
    if (!mobile) {
      alert('Please enter a mobile number');
      return;
    }
    const mobileRegex = /^[0-9]{10}$/;
    if (!mobileRegex.test(mobile)) {
        alert('Please enter a valid 10-digit mobile number');
        return;
    }
    setLoading(true);
    const fullMobile = `${countryCode}${mobile}`;
    
    // In a real app, this would trigger the OTP. 
    const { error } = await supabase.auth.signInWithOtp({
      phone: fullMobile,
    });

    setLoading(false);

    if (error) {
      console.error('Error sending OTP:', error);
      alert('Error sending OTP: ' + error.message);
    } else {
      setOtpSent(true);
    }
  };

  const handleVerifyOtp = async () => {
    if (!otp) {
      alert('Please enter OTP');
      return;
    }
    setLoading(true);
    const fullMobile = `${countryCode}${mobile}`;
    
    const {
      data: { session },
      error,
    } = await supabase.auth.verifyOtp({
      phone: fullMobile,
      token: otp,
      type: 'sms',
    });

    setLoading(false);

    if (error) {
      console.error('Error verifying OTP:', error);
      alert('Error verifying OTP: ' + error.message);
    } else {
      router.push('/institution/dashboard');
    }
  };

  const handleDemoLogin = () => {
    setLoading(true);
    localStorage.setItem('isDemo', 'true');
    setTimeout(() => {
        router.push('/institution/dashboard');
    }, 800);
  };

  return (
    <div className="min-h-screen w-full flex flex-col lg:flex-row relative bg-white font-sans overflow-hidden">
      {/* Premium Shader Background */}
      <ShadersBackground />

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
                 <div className="size-14 bg-primary-gold/10 rounded-2xl flex items-center justify-center border border-primary-gold/20 shadow-sm">
                    <School className="text-primary-gold size-7" />
                 </div>
                 <div className="text-left">
                    <span className="block text-2xl font-bold tracking-tight text-slate-900 font-serif leading-none">C2E Portal</span>
                    <span className="text-[10px] uppercase font-black tracking-widest text-slate-400">Compliance To Excellence</span>
                 </div>
            </div>

            <div className="space-y-2">
                <h1 className="animate-element animate-delay-300 text-3xl font-bold leading-tight text-slate-900 font-serif">
                    {!otpSent ? "Welcome Back" : "Verify Identity"}
                </h1>
                <p className="animate-element animate-delay-400 text-slate-500 text-base">
                    {!otpSent 
                      ? "Secure access to your institutional dashboard" 
                      : `Enter the code sent to ${countryCode} ${mobile}`}
                </p>
            </div>
          </div>

          <div className="space-y-6">
            {!otpSent ? (
              <div className="animate-element animate-delay-400 space-y-4">
                <div className="space-y-3">
                  <label className="text-sm font-bold text-slate-700 flex items-center gap-2 px-1">
                      <Phone className="size-4 text-slate-400" />
                      Mobile Number
                  </label>
                  <div className="flex gap-3">
                      <div className="w-28">
                          <GlassInputWrapper>
                              <select 
                                  className="w-full bg-transparent text-sm p-4 pr-10 rounded-2xl focus:outline-none font-bold text-slate-900 appearance-none cursor-pointer"
                                  value={countryCode}
                                  onChange={(e) => setCountryCode(e.target.value)}
                              >
                                  <option value="+91">IN +91</option>
                                  <option value="+1">US +1</option>
                                  <option value="+44">UK +44</option>
                              </select>
                          </GlassInputWrapper>
                      </div>
                      <div className="flex-1">
                          <GlassInputWrapper>
                              <input 
                                  className="w-full bg-transparent text-sm p-4 rounded-2xl focus:outline-none text-slate-900 font-medium" 
                                  placeholder="10-digit number" 
                                  type="tel"
                                  value={mobile}
                                  onChange={(e) => setMobile(e.target.value)}
                              />
                          </GlassInputWrapper>
                      </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="animate-element animate-delay-400 space-y-4">
                 <div className="space-y-3">
                  <div className="flex justify-between items-center px-1">
                      <label className="text-sm font-bold text-slate-700 flex items-center gap-2">
                          <ShieldCheck className="size-4 text-slate-400" />
                          Verification Code
                      </label>
                      <button onClick={() => setOtpSent(false)} className="text-xs text-primary-gold font-bold hover:underline">Change Number</button>
                  </div>
                  <GlassInputWrapper>
                    <div className="relative">
                      <input 
                          className="w-full bg-transparent text-2xl font-bold p-5 text-center tracking-[0.6em] rounded-2xl focus:outline-none text-slate-900 placeholder:text-slate-200" 
                          placeholder="000000" 
                          type={showOtp ? 'text' : 'password'}
                          maxLength={6}
                          value={otp}
                          onChange={(e) => setOtp(e.target.value)}
                          autoFocus
                      />
                      <button type="button" onClick={() => setShowOtp(!showOtp)} className="absolute inset-y-0 right-5 flex items-center">
                        {showOtp ? <EyeOff className="w-5 h-5 text-slate-400 hover:text-slate-600 transition-colors" /> : <Eye className="w-5 h-5 text-slate-400 hover:text-slate-600 transition-colors" />}
                      </button>
                    </div>
                  </GlassInputWrapper>
                </div>
              </div>
            )}

            <div className="animate-element animate-delay-500 flex items-center justify-between text-sm px-1">
              <label className="flex items-center gap-3 cursor-pointer group">
                <input type="checkbox" className="custom-checkbox" defaultChecked />
                <span className="text-slate-500 font-medium group-hover:text-slate-900 transition-colors">Trust this device</span>
              </label>
              <a href="#" className="text-primary-gold hover:underline font-bold text-xs uppercase tracking-wider">Trouble Logging In?</a>
            </div>

            <button 
              onClick={!otpSent ? handleSendOtp : handleVerifyOtp}
              disabled={loading}
              className="animate-element animate-delay-600 w-full rounded-2xl bg-primary-gold py-5 font-bold text-white hover:brightness-110 hover:shadow-[0_8px_20px_-6px_rgba(201,169,97,0.4)] transition-all active:scale-[0.98] flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {loading ? (
                  <span className="material-symbols-outlined animate-spin">progress_activity</span>
              ) : (
                  <>
                      {!otpSent ? "Continue" : "Verify & Sign In"}
                      <ArrowRight className="size-5" />
                  </>
              )}
            </button>
          </div>

          <div className="animate-element animate-delay-700 relative flex items-center justify-center">
            <span className="w-full border-t border-slate-100"></span>
            <span className="px-6 text-xs font-bold uppercase tracking-[0.2em] text-slate-400 bg-white absolute">Restricted Access</span>
          </div>

          <button 
              onClick={handleDemoLogin}
              className="animate-element animate-delay-800 w-full flex items-center justify-center gap-4 bg-slate-50 border border-slate-200/60 rounded-2xl py-5 hover:bg-white hover:border-primary-gold/30 hover:shadow-lg transition-all group group"
          >
              <div className="size-8 bg-primary-gold/10 rounded-full flex items-center justify-center group-hover:bg-primary-gold transition-colors">
                  <PlayCircle className="size-5 text-primary-gold group-hover:text-white transition-colors" />
              </div>
              <span className="text-base font-bold text-slate-600 group-hover:text-slate-900 transition-colors">Try Demo Version</span>
          </button>

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
