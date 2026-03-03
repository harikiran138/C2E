"use client";

import React, { useState } from "react";
import {
  ShieldCheck,
  Mail,
  ArrowRight,
  Building2,
  Loader2,
  Eye,
  EyeOff,
  Lock,
} from "lucide-react";
import { useRouter } from "next/navigation";

const GlassInputWrapper = ({ children }: { children: React.ReactNode }) => (
  <div className="rounded-md border border-slate-200 bg-slate-50 shadow-sm backdrop-blur-sm transition-all focus-within:border-slate-900 focus-within:bg-white focus-within:shadow-md">
    {children}
  </div>
);

export default function SignUp() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [institutionName, setInstitutionName] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const router = useRouter();

  const validatePassword = (pass: string) => {
    // At least 8 chars, 1 letter, 1 number, 1 special char
    const regex = /^(?=.*[A-Za-z])(?=.*\d)(?=.*[\W_]).{8,}$/;
    return regex.test(pass);
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg("");

    try {
      if (
        !institutionName.trim() ||
        !email.trim() ||
        !password ||
        !confirmPassword
      ) {
        throw new Error("All fields are required");
      }

      if (institutionName.trim().length < 3) {
        throw new Error("Institution name must be at least 3 characters");
      }

      if (password !== confirmPassword) {
        throw new Error("Passwords do not match");
      }

      if (!validatePassword(password)) {
        throw new Error(
          "Password must be at least 8 characters and include a letter, a number, and a special character.",
        );
      }

      if (institutionName.trim().length > 100) {
        throw new Error("Institution name must be at most 100 characters");
      }

      // 1. Validate on Backend (Optional, but good practice. The register route also validates)
      const validateRes = await fetch("/api/institution/signup/validate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          institutionName: institutionName.trim(),
          email: email.trim(),
          password,
          confirmPassword,
        }),
      });

      if (!validateRes.ok) {
        const payload = await validateRes.json();
        throw new Error(payload.error || "Sign up validation failed.");
      }

      // 2. Register user directly to DB (Bypassing Supabase Auth)
      const registerRes = await fetch("/api/institution/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          institutionName: institutionName.trim(),
          email: email.trim(),
          password,
          confirmPassword,
        }),
      });

      const registerData = await registerRes.json();

      if (!registerRes.ok) {
        throw new Error(registerData.error || "Registration failed.");
      }

      console.log("Registration successful for:", email);

      // Set session in localStorage for client-side checks
      localStorage.setItem(
        "inst_session",
        JSON.stringify({
          id: registerData.id,
          email: email.trim(),
          role: "institution_admin",
        }),
      );

      // Clear stale onboarding progress
      localStorage.removeItem("onboarding_data");
      localStorage.removeItem("onboarding_step");

      // Redirect to onboarding
      router.replace("/institution/onboarding");
      router.refresh();
    } catch (err: any) {
      // Improved error logging
      console.error("Sign Up Error:", err);
      setErrorMsg(err.message || "Registration failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="space-y-3">
        <div className="space-y-2">
          <label className="text-xs font-bold uppercase tracking-[0.1em] text-muted-foreground flex items-center gap-2 px-1">
            <Building2 className="size-3.5" />
            Institution Name
          </label>
          <div className="rounded-lg border border-border/60 bg-background/50 backdrop-blur-sm transition-all focus-within:border-primary/50 focus-within:ring-4 focus-within:ring-primary/10 overflow-hidden">
            <input
              className="w-full bg-transparent text-sm p-4 focus:outline-none text-foreground font-medium placeholder:text-muted-foreground/50"
              placeholder="e.g. Acme Institute of Technology"
              type="text"
              value={institutionName}
              onChange={(e) => setInstitutionName(e.target.value)}
            />
          </div>
        </div>

        <div className="space-y-2">
          <label className="text-xs font-bold uppercase tracking-[0.1em] text-muted-foreground flex items-center gap-2 px-1">
            <Mail className="size-3.5" />
            Official Email Address
          </label>
          <div className="rounded-lg border border-border/60 bg-background/50 backdrop-blur-sm transition-all focus-within:border-primary/50 focus-within:ring-4 focus-within:ring-primary/10 overflow-hidden">
            <input
              className="w-full bg-transparent text-sm p-4 focus:outline-none text-foreground font-medium placeholder:text-muted-foreground/50"
              placeholder="admin@institution.edu"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div className="space-y-2">
            <label className="text-xs font-bold uppercase tracking-[0.1em] text-muted-foreground flex items-center gap-2 px-1">
              <Lock className="size-3.5" />
              Set Password
            </label>
            <div className="rounded-lg border border-border/60 bg-background/50 backdrop-blur-sm transition-all focus-within:border-primary/50 focus-within:ring-4 focus-within:ring-primary/10 overflow-hidden">
              <div className="relative">
                <input
                  className="w-full bg-transparent text-sm p-4 focus:outline-none text-foreground font-medium placeholder:text-muted-foreground/50"
                  placeholder="••••••••"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-4 flex items-center"
                >
                  {showPassword ? (
                    <EyeOff className="size-4 text-muted-foreground" />
                  ) : (
                    <Eye className="size-4 text-muted-foreground" />
                  )}
                </button>
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-bold uppercase tracking-[0.1em] text-muted-foreground flex items-center gap-2 px-1">
              <ShieldCheck className="size-3.5" />
              Confirm Password
            </label>
            <div className="rounded-lg border border-border/60 bg-background/50 backdrop-blur-sm transition-all focus-within:border-primary/50 focus-within:ring-4 focus-within:ring-primary/10 overflow-hidden">
              <input
                className="w-full bg-transparent text-sm p-4 focus:outline-none text-foreground font-medium placeholder:text-muted-foreground/50"
                placeholder="••••••••"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
              />
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
        onClick={handleSignUp}
        disabled={loading}
        className="w-full py-4 text-sm font-bold rounded-lg transition-all bg-primary text-primary-foreground shadow-xl shadow-primary/20 hover:bg-primary/90 hover:scale-[1.02] active:scale-[0.98] flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed group"
      >
        {loading ? (
          <Loader2 className="animate-spin size-5" />
        ) : (
          <>
            Create Account{" "}
            <ArrowRight className="size-5 group-hover:translate-x-1 transition-transform" />
          </>
        )}
      </button>

      <p className="text-[10px] text-center text-muted-foreground uppercase tracking-normal font-medium !mt-2">
        By creating an account, you agree to our{" "}
        <span className="text-primary hover:underline cursor-pointer">
          Terms
        </span>{" "}
        and{" "}
        <span className="text-primary hover:underline cursor-pointer">
          Privacy
        </span>
        .
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
