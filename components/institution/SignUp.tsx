'use client';

import React, { useState } from 'react';
import { ShieldCheck, Mail, ArrowRight, Building2, Loader2, Eye, EyeOff, Lock } from 'lucide-react';
import { createClient } from '../../utils/supabase/client';
import { useRouter } from 'next/navigation';

const GlassInputWrapper = ({ children }: { children: React.ReactNode }) => (
  <div className="rounded-lg border border-slate-200 bg-slate-50 shadow-sm backdrop-blur-sm transition-all focus-within:border-slate-900 focus-within:bg-white focus-within:shadow-md">
    {children}
  </div>
);

export default function SignUp() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [institutionName, setInstitutionName] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const supabase = createClient();
  const router = useRouter();

  const validatePassword = (pass: string) => {
    const regex = /^(?=.*[A-Za-z])(?=.*\d).{8,}$/;
    return regex.test(pass);
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg('');

    try {
      if (!institutionName.trim() || !email.trim() || !password || !confirmPassword) {
        throw new Error('All fields are required');
      }

      if (institutionName.trim().length < 3) {
        throw new Error('Institution name must be at least 3 characters');
      }

      if (password !== confirmPassword) {
        throw new Error('Passwords do not match');
      }

      if (!validatePassword(password)) {
        throw new Error('Password must be at least 8 characters long and contain at least one letter and one number.');
      }

      if (institutionName.trim().length > 100) {
        throw new Error('Institution name must be at most 100 characters');
      }

      const validateRes = await fetch('/api/institution/signup/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          institutionName: institutionName.trim(),
          email: email.trim(),
          password,
          confirmPassword
        }),
      });

      if (!validateRes.ok) {
        const payload = await validateRes.json();
        throw new Error(payload.error || 'Sign up validation failed.');
      }

      // 1. Sign up user with Supabase Auth
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: email.trim(),
        password: password,
        options: {
          data: {
            institution_name: institutionName.trim()
          }
        }
      });

      if (authError) {
        // Specific error for already registered email
        if (authError.message.toLowerCase().includes('already registered') || authError.status === 422) {
          throw new Error('This email address is already registered');
        }
        throw authError;
      }
      
      if (authData.user) {
        // 2. A session is required because onboarding is no-OTP.
        if (!authData.session) {
          throw new Error('Sign up did not start a session. Disable email confirmation in Supabase Auth settings.');
        }

        // 3. Ensure institution account row exists
        const { error: upsertError } = await supabase
          .from('institutions')
          .upsert(
            {
              id: authData.user.id,
              institution_name: institutionName.trim(),
              email: email.trim(),
              onboarding_status: 'PENDING',
              updated_at: new Date().toISOString(),
            },
            { onConflict: 'id' }
          );

        if (upsertError) {
          throw new Error(upsertError.message);
        }

        console.log('Auth signup succeeded:', authData.user.id);

        console.log('Sign Up successful with active session. Redirecting to onboarding...');
        // Small delay to ensure DB trigger has executed
        setTimeout(() => {
          router.push('/institution/onboarding');
          router.refresh(); 
        }, 800);
      }
    } catch (err: any) {
      // Improved error logging to capture hidden properties (e.g. from Supabase)
      const diagnosticInfo = {
        message: err.message,
        status: err.status,
        code: err.code,
        details: err.details,
        hint: err.hint,
        name: err.name,
      };
      console.error('Sign Up Error Details:', JSON.stringify(diagnosticInfo, null, 2));
      console.error('Full Error Object:', err);

      setErrorMsg(err.message || 'Registration failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="space-y-4">
        <div className="space-y-2">
            <label className="text-sm font-semibold text-slate-700 flex items-center gap-2 px-1">
                <Building2 className="size-4 text-slate-400" />
                Institution Name
            </label>
            <GlassInputWrapper>
                <input 
                    className="w-full bg-transparent text-sm p-4 rounded-lg focus:outline-none text-slate-900 font-medium" 
                    placeholder="e.g. Acme Institute of Technology" 
                    type="text"
                    value={institutionName}
                    onChange={(e) => setInstitutionName(e.target.value)}
                />
            </GlassInputWrapper>
        </div>

        <div className="space-y-2">
          <label className="text-sm font-semibold text-slate-700 flex items-center gap-2 px-1">
              <Mail className="size-4 text-slate-400" />
              Official Email Address
          </label>
          <GlassInputWrapper>
              <input 
                  className="w-full bg-transparent text-sm p-4 rounded-lg focus:outline-none text-slate-900 font-medium" 
                  placeholder="admin@institution.edu" 
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
              />
          </GlassInputWrapper>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
                <label className="text-sm font-semibold text-slate-700 flex items-center gap-2 px-1">
                    <Lock className="size-4 text-slate-400" />
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

            <div className="space-y-2">
                <label className="text-sm font-semibold text-slate-700 flex items-center gap-2 px-1">
                    <ShieldCheck className="size-4 text-slate-400" />
                    Confirm Password
                </label>
                <GlassInputWrapper>
                    <input 
                        className="w-full bg-transparent text-sm p-4 rounded-lg focus:outline-none text-slate-900 font-medium" 
                        placeholder="••••••••" 
                        type="password"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                    />
                </GlassInputWrapper>
            </div>
        </div>
      </div>

      {errorMsg && (
        <div className="bg-red-50 text-red-600 text-sm p-4 rounded-xl border border-red-100 flex items-center gap-2">
            <AlertTriangle className="size-4 shrink-0" />
            {errorMsg}
        </div>
      )}

      <button 
        onClick={handleSignUp}
        disabled={loading}
        className="w-full py-4 text-sm font-semibold rounded-xl transition-all bg-slate-900 text-white shadow-xl hover:bg-slate-800 active:scale-[0.98] flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {loading ? <Loader2 className="animate-spin size-5" /> : <>Create Account <ArrowRight className="size-5" /></>}
      </button>
      
      <p className="text-xs text-center text-slate-400">
        By creating an account, you agree to our Terms of Service and Privacy Policy.
      </p>
    </div>
  );
}

function AlertTriangle(props: any) {
    return (
        <svg
            {...props}
            xmlns="http://www.w3.org/2000/svg"
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
        >
            <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z" />
            <path d="M12 9v4" />
            <path d="M12 17h.01" />
        </svg>
    );
}
