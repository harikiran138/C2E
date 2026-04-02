"use client";

import React, { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import {
  Eye,
  EyeOff,
  Mail,
  ArrowRight,
  ArrowLeft,
  Loader2,
  ShieldCheck,
  AlertTriangle,
  Building2,
  BookOpen,
  IdCard,
  Users,
} from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import SignUp from "./SignUp";
import { motion, AnimatePresence } from "framer-motion";
import AuthBackground from "../ui/AuthBackground";
import { buildMutationHeaders } from "@/lib/client-security";
import { buildProgramLoginEmail } from "@/lib/program-login";

type AuthMode = "institution" | "program" | "stakeholder";

interface InstituteOption {
  id: string;
  name: string;
  shortform?: string;
}

interface ProgramOption {
  id: string;
  name: string;
  code: string;
  email?: string;
}

export default function Login() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const stakeholderRequested = useMemo(
    () => searchParams.get("type") === "stakeholder",
    [searchParams],
  );
  const redirectPath = searchParams.get("redirect");

  const [authMode, setAuthMode] = useState<AuthMode>(
    stakeholderRequested ? "stakeholder" : "institution",
  );
  const [isSignUp, setIsSignUp] = useState(false);
  const [showInstPassword, setShowInstPassword] = useState(false);
  const [showStakePassword, setShowStakePassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [institutes, setInstitutes] = useState<InstituteOption[]>([]);
  const [programs, setPrograms] = useState<ProgramOption[]>([]);
  const [loadingInstitutes, setLoadingInstitutes] = useState(false);
  const [loadingPrograms, setLoadingPrograms] = useState(false);
  const [selectedInstituteId, setSelectedInstituteId] = useState("");
  const [selectedProgramId, setSelectedProgramId] = useState("");
  const [stakeholderId, setStakeholderId] = useState("");
  const [stakeholderPassword, setStakeholderPassword] = useState("");

  const [programEmail, setProgramEmail] = useState("");
  const [programPassword, setProgramPassword] = useState("");

  // Password Reset State
  const [isResetMode, setIsResetMode] = useState(false);
  const [resetStakeholderRefId, setResetStakeholderRefId] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const selectedInstitute = useMemo(
    () => institutes.find((institute) => institute.id === selectedInstituteId) || null,
    [institutes, selectedInstituteId],
  );
  const selectedProgram = useMemo(
    () => programs.find((program) => program.id === selectedProgramId) || null,
    [programs, selectedProgramId],
  );
  const generatedProgramEmail = useMemo(() => {
    if (!selectedProgram) {
      return "";
    }

    return (
      selectedProgram.email ||
      buildProgramLoginEmail(
        selectedProgram.code,
        selectedInstitute?.shortform,
        selectedInstitute?.name,
      )
    );
  }, [selectedInstitute?.name, selectedInstitute?.shortform, selectedProgram]);

  useEffect(() => {
    // Point #3: Always clear existing sessions before entering login flow
    const clearSession = async () => {
      try {
        await fetch("/api/auth/logout", {
          method: "POST",
          credentials: "include",
          headers: buildMutationHeaders(),
        });
        const supabase = (await import("@/utils/supabase/client")).createClient();
        await supabase.auth.signOut();
      } catch (err) {
        console.warn("Supabase cleanup error:", err);
      }
      
      localStorage.clear();
      sessionStorage.clear();
      
      // Clear cookies client-side (non-httpOnly ones)
      document.cookie = 'c2e_auth_token=; Max-Age=0; path=/;';
      document.cookie = 'institution_token=; Max-Age=0; path=/;';
      
      localStorage.removeItem("isDemo");
      localStorage.removeItem("demoInstName");
    };

    clearSession();
  }, []);

  useEffect(() => {
    if (stakeholderRequested) {
      setAuthMode("stakeholder");
      setIsSignUp(false);
    }
  }, [stakeholderRequested]);

  useEffect(() => {
    const loadInstitutes = async () => {
      setLoadingInstitutes(true);
      try {
        const response = await fetch("/api/stakeholder/login/options");
        const payload = await response.json();
        if (!response.ok) {
          throw new Error(payload.error || "Failed to load institutes");
        }
        setInstitutes(payload.institutes || []);
      } catch (error) {
        console.error("Institute options error:", error);
        setErrorMsg("Failed to load institutes for stakeholder login.");
      } finally {
        setLoadingInstitutes(false);
      }
    };

    if ((authMode === "stakeholder" || authMode === "program") && institutes.length === 0) {
      loadInstitutes();
    }
  }, [authMode, institutes.length]);

  useEffect(() => {
    const loadPrograms = async () => {
      if (!selectedInstituteId) {
        setPrograms([]);
        setSelectedProgramId("");
        if (authMode === "program") {
          setProgramEmail("");
        }
        return;
      }

      setLoadingPrograms(true);
      try {
        const response = await fetch(
          `/api/stakeholder/login/options?instituteId=${selectedInstituteId}`,
        );
        const payload = await response.json();
        if (!response.ok) {
          throw new Error(payload.error || "Failed to load programs");
        }
        setPrograms(payload.programs || []);
      } catch (error) {
        console.error("Program options error:", error);
        setErrorMsg("Failed to load programs for selected institute.");
      } finally {
        setLoadingPrograms(false);
      }
    };

    if (authMode === "stakeholder" || authMode === "program") {
      loadPrograms();
    }
  }, [authMode, selectedInstituteId]);

  useEffect(() => {
    if (authMode === "program") {
      setProgramEmail(generatedProgramEmail);
    }
  }, [authMode, generatedProgramEmail]);

  const updateModeInQuery = (mode: AuthMode) => {
    const params = new URLSearchParams(searchParams.toString());
    if (mode === "stakeholder") {
      params.set("type", "stakeholder");
    } else if (mode === "program") {
      params.set("type", "program");
    } else {
      params.delete("type");
    }
    const query = params.toString();
    router.replace(
      query ? `/institution/login?${query}` : "/institution/login",
    );
  };

  const switchAuthMode = (mode: AuthMode) => {
    setAuthMode(mode);
    setErrorMsg(null);
    if (mode === "stakeholder") {
      setIsSignUp(false);
    }
    updateModeInQuery(mode);
  };

  const handleInstitutionSignIn = async () => {
    const trimmedEmail = email.trim();
    if (!trimmedEmail || !password) {
      setErrorMsg("Please enter both email and password");
      return;
    }

    setLoading(true);
    setErrorMsg(null);

    try {
      const res = await fetch("/api/auth/institute/login", {
        method: "POST",
        headers: buildMutationHeaders(),
        body: JSON.stringify({ identifier: trimmedEmail, password }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Login failed");
      }

      // Point #3: Clear old session data before setting new one
      localStorage.clear();
      sessionStorage.clear();

      localStorage.setItem(
        "inst_session",
        JSON.stringify({
          id: data.id,
          email: trimmedEmail,
          role: data.role || "INSTITUTE_ADMIN",
        }),
      );

      localStorage.removeItem("onboarding_data");
      localStorage.removeItem("onboarding_step");
      

      window.location.href =
        redirectPath ||
        data.redirect ||
        (data.role === "SUPER_ADMIN" ? "/dashboard" : "/institution/dashboard");
    } catch (err: any) {
      console.error("Institution Login Error:", err);
      setErrorMsg(
        err.message || "Authentication failed. Please check your connection.",
      );
    } finally {
      setLoading(false);
    }
  };

  const handleProgramSignIn = async () => {
    const trimmedEmail = programEmail.trim().toLowerCase();
    if (!trimmedEmail || !programPassword) {
      setErrorMsg("Please enter your program email and password.");
      return;
    }

    // Basic email validation
    if (!trimmedEmail.includes("@")) {
      setErrorMsg("Please enter a valid program email address");
      return;
    }

    setLoading(true);
    setErrorMsg(null);

    try {
      const res = await fetch("/api/program/login", {
        method: "POST",
        headers: buildMutationHeaders(),
        body: JSON.stringify({ email: trimmedEmail, password: programPassword }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Program login failed");
      }

      localStorage.setItem(
        "inst_session",
        JSON.stringify({
          id: data.program?.id,
          email: trimmedEmail,
          role: "PROGRAM_ADMIN",
          programCode: data.program?.code,
        }),
      );

      localStorage.removeItem("onboarding_data");
      localStorage.removeItem("onboarding_step");


      window.location.href = redirectPath || data.redirect || "/program/dashboard";
    } catch (err: any) {
      console.error("Program Login Error:", err);
      setErrorMsg(
        err.message || "Authentication failed. Please check your credentials.",
      );
    } finally {
      setLoading(false);
    }
  };

  const handleStakeholderSignIn = async () => {
    if (
      !selectedInstituteId ||
      !selectedProgramId ||
      !stakeholderId.trim() ||
      !stakeholderPassword
    ) {
      setErrorMsg(
        "Please fill institute, program, stakeholder ID, and password.",
      );
      return;
    }

    setLoading(true);
    setErrorMsg(null);

    try {
      const res = await fetch("/api/stakeholder/login", {
        method: "POST",
        headers: buildMutationHeaders(),
        body: JSON.stringify({
          institute_id: selectedInstituteId,
          program_id: selectedProgramId,
          stakeholder_id: stakeholderId.trim(),
          stakeholder_password: stakeholderPassword,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        if (res.status === 403 && data.requires_password_change) {
          setResetStakeholderRefId(data.stakeholder_ref_id);
          setIsResetMode(true);
          setLoading(false);
          return;
        }
        throw new Error(data.error || "Stakeholder login failed");
      }

      localStorage.setItem(
        "stakeholder_session",
        JSON.stringify({
          stakeholderId:
            data?.stakeholder?.stakeholder_id || stakeholderId.trim(),
          role: "stakeholder",
          instituteId: selectedInstituteId,
          programId: selectedProgramId,
        }),
      );

      window.location.href = redirectPath || "/stakeholder/dashboard";
    } catch (err: any) {
      console.error("Stakeholder Login Error:", err);
      setErrorMsg(err.message || "Stakeholder login failed.");
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordReset = async () => {
    if (!newPassword || newPassword !== confirmPassword) {
      setErrorMsg("Passwords must match and cannot be empty.");
      return;
    }
    if (newPassword.length < 8) {
      setErrorMsg("New password must be at least 8 characters long.");
      return;
    }

    setLoading(true);
    setErrorMsg(null);

    try {
      const res = await fetch("/api/stakeholder/first-password", {
        method: "POST",
        headers: buildMutationHeaders(),
        body: JSON.stringify({
          stakeholder_ref_id: resetStakeholderRefId,
          old_password: stakeholderPassword,
          new_password: newPassword,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Password reset failed");

      setIsResetMode(false);
      setStakeholderPassword(newPassword);
      setNewPassword("");
      setConfirmPassword("");
      setErrorMsg(
        "Password updated successfully! Please click Sign In again to continue.",
      );
    } catch (err: any) {
      console.error("Password Reset Error:", err);
      setErrorMsg(err.message || "Password reset failed.");
    } finally {
      setLoading(false);
    }
  };

  const renderAuthForm = () => {
    return (
      <AnimatePresence mode="wait" initial={false}>
        {authMode === "institution" && isSignUp ? (
          <motion.div
            key="institution-signup"
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            transition={{ type: "spring", stiffness: 260, damping: 20 }}
          >
            <SignUp />
          </motion.div>
        ) : authMode === "institution" ? (
          <motion.div
            key="institution-signin"
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            transition={{ type: "spring", stiffness: 260, damping: 20 }}
            className="space-y-4"
          >
            <div className="space-y-3">
              <FieldLabel icon={Mail} text="Email Address" />
              <InputField
                type="email"
                value={email}
                onChange={setEmail}
                placeholder="institution@example.com"
                leadingIcon={Mail}
              />

              <FieldLabel icon={ShieldCheck} text="Password" />
              <PasswordField
                value={password}
                onChange={setPassword}
                showPassword={showInstPassword}
                setShowPassword={setShowInstPassword}
              />
            </div>

            {errorMsg && <ErrorMessage text={errorMsg} />}

            <button
              onClick={handleInstitutionSignIn}
              disabled={loading}
              className="group flex w-full items-center justify-center gap-2 rounded-lg bg-primary py-4 text-sm font-bold text-primary-foreground shadow-xl shadow-primary/20 transition-all hover:scale-[1.02] hover:bg-primary/90 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50"
            >
              {loading ? (
                <Loader2 className="size-5 animate-spin" />
              ) : (
                <>
                  Sign In{" "}
                  <ArrowRight className="size-5 transition-transform group-hover:translate-x-1" />
                </>
              )}
            </button>
          </motion.div>
        ) : isResetMode ? (
          <motion.div
            key="stakeholder-reset"
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            transition={{ type: "spring", stiffness: 260, damping: 20 }}
            className="space-y-4"
          >
            <div className="rounded-lg border border-amber-500/20 bg-amber-500/10 p-4 text-sm text-amber-500 mb-4">
              <p className="font-semibold flex items-center gap-2">
                <AlertTriangle className="size-4" /> Action Required
              </p>
              <p className="mt-1 text-xs">
                For security reasons, you must change your default password before accessing the system.
              </p>
            </div>

            <div className="space-y-3">
              <FieldLabel icon={ShieldCheck} text="New Password" />
              <PasswordField
                value={newPassword}
                onChange={setNewPassword}
                showPassword={showNewPassword}
                setShowPassword={setShowNewPassword}
              />

              <FieldLabel icon={ShieldCheck} text="Confirm New Password" />
              <PasswordField
                value={confirmPassword}
                onChange={setConfirmPassword}
                showPassword={showConfirmPassword}
                setShowPassword={setShowConfirmPassword}
              />
            </div>

            {errorMsg && !errorMsg.includes("updated successfully") && <ErrorMessage text={errorMsg} />}
            {errorMsg && errorMsg.includes("updated successfully") && (
              <div className="flex items-center gap-2 rounded-lg border border-green-500/20 bg-green-500/10 p-4 text-sm text-green-500">
                {errorMsg}
              </div>
            )}

            <div className="flex flex-col gap-2">
              <button
                onClick={handlePasswordReset}
                disabled={loading}
                className="group flex w-full items-center justify-center gap-2 rounded-lg bg-primary py-4 text-sm font-bold text-primary-foreground shadow-xl shadow-primary/20 transition-all hover:scale-[1.02] hover:bg-primary/90 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50"
              >
                {loading ? <Loader2 className="size-5 animate-spin" /> : <>Update Password & Continue</>}
              </button>
              <button
                onClick={() => {
                  setIsResetMode(false);
                  setErrorMsg(null);
                }}
                className="text-muted-foreground hover:text-foreground text-xs font-semibold py-2"
              >
                Cancel
              </button>
            </div>
          </motion.div>
        ) : authMode === "stakeholder" ? (
          <motion.div
            key="stakeholder-signin"
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            transition={{ type: "spring", stiffness: 260, damping: 20 }}
            className="space-y-4"
          >
            <div className="space-y-3">
              <FieldLabel icon={Building2} text="Institute Name" />
              <select
                value={selectedInstituteId}
                onChange={(event) => {
                  setSelectedInstituteId(event.target.value);
                  setSelectedProgramId("");
                }}
                className="w-full rounded-lg border border-border/60 bg-background/50 p-4 text-sm font-medium text-foreground outline-none transition-all focus:border-primary/50 focus:ring-4 focus:ring-primary/10"
              >
                <option value="">{loadingInstitutes ? "Loading institutes..." : "Select Institute"}</option>
                {institutes.map((institute) => (
                  <option key={institute.id} value={institute.id}>
                    {institute.name}
                  </option>
                ))}
              </select>

              <FieldLabel icon={BookOpen} text="Program" />
              <select
                value={selectedProgramId}
                onChange={(event) => setSelectedProgramId(event.target.value)}
                disabled={!selectedInstituteId || loadingPrograms}
                className="w-full rounded-lg border border-border/60 bg-background/50 p-4 text-sm font-medium text-foreground outline-none transition-all focus:border-primary/50 focus:ring-4 focus:ring-primary/10 disabled:cursor-not-allowed disabled:opacity-60"
              >
                <option value="">
                  {!selectedInstituteId ? "Select Institute first" : loadingPrograms ? "Loading programs..." : "Select Program"}
                </option>
                {programs.map((program) => (
                  <option key={program.id} value={program.id}>
                    {program.name} {program.code ? `(${program.code})` : ""}
                  </option>
                ))}
              </select>

              <FieldLabel icon={IdCard} text="Stakeholder ID" />
              <InputField
                type="text"
                value={stakeholderId}
                onChange={setStakeholderId}
                placeholder="e.g. NSRIT-MECH-001"
                leadingIcon={Users}
              />

              <FieldLabel icon={ShieldCheck} text="Password" />
              <PasswordField
                value={stakeholderPassword}
                onChange={setStakeholderPassword}
                showPassword={showStakePassword}
                setShowPassword={setShowStakePassword}
              />
            </div>

            {errorMsg && <ErrorMessage text={errorMsg} />}

            <button
              onClick={handleStakeholderSignIn}
              disabled={loading}
              className="group flex w-full items-center justify-center gap-2 rounded-lg bg-primary py-4 text-sm font-bold text-primary-foreground shadow-xl shadow-primary/20 transition-all hover:scale-[1.02] hover:bg-primary/90 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50"
            >
              {loading ? (
                <Loader2 className="size-5 animate-spin" />
              ) : (
                <>
                  Stakeholder Sign In
                  <ArrowRight className="size-5 transition-transform group-hover:translate-x-1" />
                </>
              )}
            </button>
          </motion.div>
        ) : authMode === "program" ? (
          <motion.div
            key="program-signin"
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            transition={{ type: "spring", stiffness: 260, damping: 20 }}
            className="space-y-4"
          >


            <div className="space-y-3">
              <FieldLabel icon={Building2} text="Institute Name" />
              <select
                value={selectedInstituteId}
                onChange={(event) => {
                  setSelectedInstituteId(event.target.value);
                  setSelectedProgramId("");
                  setProgramEmail("");
                }}
                className="w-full rounded-lg border border-border/60 bg-background/50 p-4 text-sm font-medium text-foreground outline-none transition-all focus:border-primary/50 focus:ring-4 focus:ring-primary/10"
              >
                <option value="">
                  {loadingInstitutes ? "Loading institutes..." : "Select Institute"}
                </option>
                {institutes.map((institute) => (
                  <option key={institute.id} value={institute.id}>
                    {institute.name}
                    {institute.shortform ? ` (${institute.shortform})` : ""}
                  </option>
                ))}
              </select>

              <FieldLabel icon={BookOpen} text="Program" />
              <select
                value={selectedProgramId}
                onChange={(event) => setSelectedProgramId(event.target.value)}
                disabled={!selectedInstituteId || loadingPrograms}
                className="w-full rounded-lg border border-border/60 bg-background/50 p-4 text-sm font-medium text-foreground outline-none transition-all focus:border-primary/50 focus:ring-4 focus:ring-primary/10 disabled:cursor-not-allowed disabled:opacity-60"
              >
                <option value="">
                  {!selectedInstituteId
                    ? "Select Institute first"
                    : loadingPrograms
                      ? "Loading programs..."
                      : "Select Program"}
                </option>
                {programs.map((program) => (
                  <option key={program.id} value={program.id}>
                    {program.name} {program.code ? `(${program.code})` : ""}
                  </option>
                ))}
              </select>

              <FieldLabel icon={Mail} text="Program Email" />
              <InputField
                type="email"
                value={programEmail}
                onChange={setProgramEmail}
                placeholder="e.g. mech@nsrit.c2x.ai"
                leadingIcon={Mail}
              />
              {generatedProgramEmail ? (
                <p className="px-1 text-[11px] font-medium text-muted-foreground">
                  Generated with the institution short form:{" "}
                  <span className="font-semibold text-foreground">
                    {generatedProgramEmail}
                  </span>
                </p>
              ) : (
                <p className="px-1 text-[11px] font-medium text-muted-foreground">
                  Program email follows{" "}
                  <code>{`{program_code}@{institution_shortform}.c2x.ai`}</code>.
                </p>
              )}

              <FieldLabel icon={ShieldCheck} text="Password" />
              <PasswordField
                value={programPassword}
                onChange={setProgramPassword}
                showPassword={showNewPassword}
                setShowPassword={setShowNewPassword}
              />
            </div>

            {errorMsg && <ErrorMessage text={errorMsg} />}

            <button
              onClick={handleProgramSignIn}
              disabled={loading}
              className="group flex w-full items-center justify-center gap-2 rounded-lg bg-primary py-4 text-sm font-bold text-primary-foreground shadow-xl shadow-primary/20 transition-all hover:scale-[1.02] hover:bg-primary/90 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50"
            >
              {loading ? (
                <Loader2 className="size-5 animate-spin" />
              ) : (
                <>
                  Program Sign In
                  <ArrowRight className="size-5 transition-transform group-hover:translate-x-1" />
                </>
              )}
            </button>
          </motion.div>
        ) : null}
      </AnimatePresence>
    );
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
                  {authMode === "stakeholder"
                    ? "Stakeholder Login"
                    : authMode === "program"
                      ? "Program Login"
                      : isSignUp
                        ? "Create Account"
                        : "Welcome Back"}
                </h1>

                <div className="relative flex w-full items-center gap-1 rounded-xl border border-border/20 bg-muted/50 p-1">
                  <button
                    onClick={() => switchAuthMode("institution")}
                    className={`relative z-10 flex-1 rounded-lg py-2.5 text-xs font-bold transition-all ${
                      authMode === "institution"
                        ? "text-primary-foreground"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    Institute
                  </button>
                  <button
                    onClick={() => switchAuthMode("program")}
                    className={`relative z-10 flex-1 rounded-lg py-2.5 text-xs font-bold transition-all ${
                      authMode === "program"
                        ? "text-primary-foreground"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    Program
                  </button>
                  <button
                    onClick={() => switchAuthMode("stakeholder")}
                    className={`relative z-10 flex-1 rounded-lg py-2.5 text-xs font-bold transition-all ${
                      authMode === "stakeholder"
                        ? "text-primary-foreground"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    Stakeholder
                  </button>
                  <motion.div
                    className="absolute inset-y-1 left-1 w-[calc(33.33%-2.66px)] rounded-lg bg-primary shadow-lg"
                    initial={false}
                    animate={{ 
                      x: authMode === "institution" ? "0%" : authMode === "program" ? "100%" : "200%",
                      marginLeft: authMode === "institution" ? "0px" : authMode === "program" ? "4px" : "8px"
                    }}
                    transition={{ type: "spring", stiffness: 300, damping: 25 }}
                  />
                </div>

                {authMode === "institution" && (
                  <div className="relative flex w-full items-center gap-2 rounded-xl border border-border/20 bg-muted/50 p-1">
                    <button
                      onClick={() => setIsSignUp(false)}
                      className={`relative z-10 flex-1 rounded-lg py-2.5 text-xs font-bold transition-all ${
                        !isSignUp
                          ? "text-primary-foreground"
                          : "text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      Sign In
                    </button>
                    <button
                      onClick={() => setIsSignUp(true)}
                      className={`relative z-10 flex-1 rounded-lg py-2.5 text-xs font-bold transition-all ${
                        isSignUp
                          ? "text-primary-foreground"
                          : "text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      Sign Up
                    </button>
                    <motion.div
                      className="absolute inset-y-1 left-1 w-[calc(50%-4px)] rounded-lg bg-primary shadow-lg"
                      initial={false}
                      animate={{ x: isSignUp ? "100%" : "0%" }}
                      transition={{
                        type: "spring",
                        stiffness: 300,
                        damping: 25,
                      }}
                    />
                  </div>
                )}
              </div>

              {/* v5.1: Content rendered via helper to avoid deep nesting and parser errors */}
              {renderAuthForm()}

              <div className="flex items-center justify-center gap-2 mt-4 opacity-50">
                <div className="size-1.5 rounded-full bg-green-500 animate-pulse" />
                <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                  Database Connected Securely
                </span>
              </div>
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
