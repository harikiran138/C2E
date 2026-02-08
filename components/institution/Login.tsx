'use client';

import React, { useState } from 'react';
import { createClient } from '../../utils/supabase/client';
import { useRouter } from 'next/navigation';

export default function InstitutionLogin() {
  const [mobile, setMobile] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [otp, setOtp] = useState('');
  const supabase = createClient();
  const router = useRouter();

  const [loading, setLoading] = useState(false);
  const [countryCode, setCountryCode] = useState('+91');

  const handleSendOtp = async () => {
    if (!mobile) {
      alert('Please enter a mobile number');
      return;
    }
    setLoading(true);
    const fullMobile = `${countryCode}${mobile}`;
    console.log('Sending OTP to', fullMobile);
    
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
      console.log('OTP verified, session:', session);
      router.push('/institution/details');
    }
  };

  return (
    <div className="bg-slate-50 dark:bg-slate-900 font-sans min-h-screen flex items-center justify-center p-4">
      {/* Mobile Container mimicking Phone screen */}
      <div className="relative w-full max-w-[400px] min-h-[750px] bg-white dark:bg-slate-900 shadow-2xl rounded-[3rem] border-[8px] border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col">
        
        {/* Status Bar Space (iOS feel) */}
        <div className="h-10 w-full flex justify-between items-center px-8 pt-4">
          <span className="text-xs font-bold dark:text-white">9:41</span>
          <div className="flex gap-1.5">
            <span className="material-symbols-outlined text-[16px] dark:text-white">signal_cellular_4_bar</span>
            <span className="material-symbols-outlined text-[16px] dark:text-white">wifi</span>
            <span className="material-symbols-outlined text-[16px] dark:text-white">battery_full</span>
          </div>
        </div>

        {/* Background Decorative Pattern */}
        <div className="absolute inset-0 academic-pattern pointer-events-none opacity-5" style={{backgroundImage: 'radial-gradient(#137fec 0.5px, transparent 0.5px)', backgroundSize: '24px 24px'}}></div>
        
        <div className="relative z-10 flex flex-col flex-1 px-8 pt-12">
          {/* Header Section */}
          <div className="flex flex-col items-center mb-10">
            <div className="size-20 bg-blue-500/10 rounded-2xl flex items-center justify-center mb-4 border border-blue-500/20">
              <span className="material-symbols-outlined text-[#137fec] text-4xl">school</span>
            </div>
            <h1 className="font-serif text-2xl text-slate-800 dark:text-slate-100 font-bold text-center leading-tight">
              Global Academic Institute
            </h1>
            <p className="text-slate-500 dark:text-slate-400 text-sm mt-2 font-medium">Excellence in Education</p>
          </div>

          {/* Segmented Toggle */}
          <div className="bg-slate-100 dark:bg-slate-800 p-1 rounded-xl flex mb-10">
            <button className="flex-1 py-2.5 text-sm font-semibold rounded-lg transition-all bg-white dark:bg-slate-700 text-[#137fec] shadow-sm">
              Sign In
            </button>
            <button className="flex-1 py-2.5 text-sm font-semibold rounded-lg transition-all text-slate-500 dark:text-slate-400">
              Sign Up
            </button>
          </div>

          {/* Form Section */}
          <div className="flex-1 flex flex-col">
            <div className="space-y-6">
              {!otpSent ? (
                <div>
                  <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2 px-1">Mobile Number</label>
                  <div className="flex gap-3">
                    {/* Country Code Picker */}
                    <div className="relative flex items-center">
                      <select 
                        value={countryCode}
                        onChange={(e) => setCountryCode(e.target.value)}
                        className="appearance-none bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3.5 pr-10 text-slate-800 dark:text-slate-200 font-medium focus:ring-2 focus:ring-blue-500/20 focus:border-[#137fec] outline-none transition-all cursor-pointer"
                      >
                        <option value="+91">+91</option>
                        <option value="+1">+1</option>
                        <option value="+44">+44</option>
                      </select>
                      <span className="material-symbols-outlined absolute right-3 pointer-events-none text-slate-400 text-xl">expand_more</span>
                    </div>
                    {/* Phone Input */}
                    <div className="flex-1">
                      <input 
                        className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3.5 text-slate-800 dark:text-slate-200 placeholder:text-slate-400 font-medium focus:ring-2 focus:ring-blue-500/20 focus:border-[#137fec] outline-none transition-all" 
                        placeholder="Enter mobile number" 
                        type="tel"
                        value={mobile}
                        onChange={(e) => setMobile(e.target.value)}
                      />
                    </div>
                  </div>
                </div>
              ) : (
                 <div>
                  <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2 px-1">Enter OTP</label>
                  <input 
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3.5 text-slate-800 dark:text-slate-200 placeholder:text-slate-400 font-medium focus:ring-2 focus:ring-blue-500/20 focus:border-[#137fec] outline-none transition-all text-center tracking-widest text-xl" 
                    placeholder="XXXXXX" 
                    type="text"
                    maxLength={6}
                    value={otp}
                    onChange={(e) => setOtp(e.target.value)}
                  />
                </div>
              )}
            </div>

            <div className="mt-8">
              <p className="text-[13px] text-slate-500 dark:text-slate-400 text-center leading-relaxed">
                We will send you an <span className="font-bold text-slate-700 dark:text-slate-200">One Time Password</span> on this mobile number.
              </p>
            </div>
          </div>

          {/* Action Section */}
          <div className="pb-12 mt-auto">
            <button 
              onClick={!otpSent ? handleSendOtp : handleVerifyOtp}
              disabled={loading}
              className={`w-full bg-[#137fec] hover:bg-[#137fec]/90 text-white font-bold py-4 rounded-xl shadow-lg shadow-blue-500/25 transition-all active:scale-[0.98] flex items-center justify-center gap-2 ${loading ? 'opacity-70 cursor-not-allowed' : ''}`}
            >
              {loading ? 'Processing...' : (!otpSent ? 'Get OTP' : 'Verify & Login')}
              {!loading && <span className="material-symbols-outlined text-[20px]">arrow_forward</span>}
            </button>
            <p className="text-xs text-slate-400 dark:text-slate-500 text-center mt-6">
              By continuing, you agree to our <br/>
              <a className="text-[#137fec] hover:underline" href="#">Terms of Service</a> and <a className="text-[#137fec] hover:underline" href="#">Privacy Policy</a>
            </p>
          </div>

          {/* Home Indicator (iOS style) */}
          <div className="absolute bottom-2 left-1/2 -translate-x-1/2 w-32 h-1.5 bg-slate-200 dark:bg-slate-700 rounded-full"></div>
        </div>
      </div>
    </div>
  );
}
