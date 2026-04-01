"use client";

import React, { useState } from "react";
import Image from "next/image";
import {
  Eye,
  EyeOff,
  User,
  ArrowRight,
  ArrowLeft,
  Loader2,
  ShieldCheck,
  AlertTriangle,
} from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";
import AuthBackground from "../ui/AuthBackground";

export default function SystemLogin() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectPath = searchParams.get("redirect") || "/dashboard";

  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");

  const handleSuperAdminSignIn = async () => {
    const trimmedIdentifier = identifier.trim();
    if (!trimmedIdentifier || !password) {
      setErrorMsg("Please enter both Admin ID and password");
      return;
    }

    setLoading(true);
    setErrorMsg(null);

    try {
      const res = await fetch("/api/auth/super/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ identifier: trimmedIdentifier, password }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Login failed");
      }

      localStorage.setItem(
        "super_session",
        JSON.stringify({
          email: trimmedIdentifier,
          role: "SUPER_ADMIN",
        }),
      );

      // Hard refresh to ensure middleware picks up the new cookie
      window.location.href = redirectPath;
    } catch (err: any) {
      console.error("Super Admin Login Error:", err);
      setErrorMsg(
        err.message || "Authentication failed. Please check your credentials.",
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthBackground className="flex-row items-stretch justify-start !p-0">
      <div className="relative flex h-full w-full flex-1 flex-col overflow-hidden font-sans selection:bg-primary/20 lg:flex-row">
        <Link
          href="/"
          className="group fixed left-8 top-8 z-50 flex items-center gap-2 rounded-full border border-border/40 bg-card/40 px-6 py-3 font-semibold text-foreground shadow-xl backdrop-blur-xl transition-all hover:scale-105 hover:bg-card/60"
        >
          <ArrowLeft className="size-4 transition-transform group-hover:-translate-x-1" />
          <span className="text-xs uppercase tracking-widest">Back</span>
        </Link>

        <section className="relative z-10 hidden flex-1 lg:block" />

        <section
          className="relative z-10 flex h-full flex-1 items-center justify-center overflow-y-auto p-6 lg:p-12"
          data-lenis-prevent
        >
          <motion.main
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{
              duration: 0.4,
              layout: { type: "spring", stiffness: 200, damping: 25 },
            }}
            layout="position"
            className="relative w-full max-w-[520px] overflow-hidden rounded-3xl border border-border/40 bg-card/40 p-8 shadow-2xl backdrop-blur-3xl lg:p-12"
          >
            <div className="absolute inset-x-0 -top-px h-px bg-gradient-to-r from-transparent via-primary/50 to-transparent" />

            <div className="relative flex flex-col gap-6">
              <div className="flex flex-col items-center gap-4 text-center">
                <div className="mb-1 flex flex-col items-center gap-3">
                  <div className="flex size-14 items-center justify-center rounded-xl bg-primary p-3 shadow-2xl shadow-primary/20">
                    <Image
                      src="/C2XPlus.jpeg"
                      alt="C2X Logo"
                      width={48}
                      height={48}
                      className="rounded-lg object-contain"
                    />
                  </div>
                  <div className="space-y-0.5 text-center">
                    <span className="block text-xl font-black leading-none tracking-tight text-foreground">
                      C2X Plus+
                    </span>
                    <span className="block text-[9px] font-bold uppercase tracking-[0.2em] text-muted-foreground">
                      Compliance to Excellence
                    </span>
                  </div>
                </div>

                <h1 className="text-2xl font-bold tracking-tight text-foreground">
                  System Administration
                </h1>

                <div className="rounded-lg border border-primary/20 bg-primary/10 p-4 text-sm text-primary mb-2 mt-2">
                  <p className="font-semibold flex items-center justify-center gap-2">
                    <ShieldCheck className="size-4" /> Super Admin Access Only
                  </p>
                </div>
              </div>

              <motion.div
                key="super-admin-signin"
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -15 }}
                transition={{ type: "spring", stiffness: 260, damping: 20 }}
                className="space-y-4"
              >
                <div className="space-y-3">
                  <FieldLabel icon={User} text="Admin ID / Email" />
                  <InputField
                    type="text"
                    value={identifier}
                    onChange={setIdentifier}
                    placeholder="admin@c2x.com"
                    leadingIcon={User}
                  />

                  <FieldLabel icon={ShieldCheck} text="Password" />
                  <PasswordField
                    value={password}
                    onChange={setPassword}
                    showPassword={showPassword}
                    setShowPassword={setShowPassword}
                  />
                </div>

                {errorMsg && <ErrorMessage text={errorMsg} />}

                <button
                  onClick={handleSuperAdminSignIn}
                  disabled={loading}
                  className="group flex w-full items-center justify-center gap-2 rounded-lg bg-primary py-4 text-sm font-bold text-primary-foreground shadow-xl shadow-primary/20 transition-all hover:scale-[1.02] hover:bg-primary/90 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {loading ? (
                    <Loader2 className="size-5 animate-spin" />
                  ) : (
                    <>
                      Secure Login{" "}
                      <ArrowRight className="size-5 transition-transform group-hover:translate-x-1" />
                    </>
                  )}
                </button>
              </motion.div>
            </div>
          </motion.main>
        </section>
      </div>
    </AuthBackground>
  );
}

function FieldLabel({
  icon: Icon,
  text,
}: {
  icon: React.ComponentType<{ className?: string }>;
  text: string;
}) {
  return (
    <label className="flex items-center gap-2 px-1 text-xs font-bold uppercase tracking-[0.1em] text-muted-foreground">
      <Icon className="size-3.5" />
      {text}
    </label>
  );
}

function InputField({
  type,
  value,
  onChange,
  placeholder,
  leadingIcon: Icon,
}: {
  type: string;
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  leadingIcon?: React.ComponentType<{ className?: string }>;
}) {
  return (
    <div className="rounded-lg border border-border/60 bg-background/50 backdrop-blur-sm transition-all focus-within:border-primary/50 focus-within:ring-4 focus-within:ring-primary/10 overflow-hidden">
      <div className="relative">
        {Icon && (
          <Icon className="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        )}
        <input
          className={`w-full bg-transparent p-4 text-sm font-medium text-foreground placeholder:text-muted-foreground/50 focus:outline-none ${
            Icon ? "pl-11" : ""
          }`}
          type={type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
        />
      </div>
    </div>
  );
}

function PasswordField({
  value,
  onChange,
  showPassword,
  setShowPassword,
}: {
  value: string;
  onChange: (value: string) => void;
  showPassword: boolean;
  setShowPassword: (value: boolean) => void;
}) {
  return (
    <div className="overflow-hidden rounded-lg border border-border/60 bg-background/50 backdrop-blur-sm transition-all focus-within:border-primary/50 focus-within:ring-4 focus-within:ring-primary/10">
      <div className="relative">
        <input
          className="w-full bg-transparent p-4 text-sm font-medium text-foreground placeholder:text-muted-foreground/50 focus:outline-none"
          placeholder="••••••••"
          type={showPassword ? "text" : "password"}
          value={value}
          onChange={(e) => onChange(e.target.value)}
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
  );
}

function ErrorMessage({ text }: { text: string }) {
  return (
    <div className="flex items-center gap-2 rounded-lg border border-destructive/20 bg-destructive/10 p-4 text-sm text-destructive">
      <AlertTriangle className="size-4 shrink-0" />
      {text}
    </div>
  );
}
