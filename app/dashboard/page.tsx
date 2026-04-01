"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Building2,
  GraduationCap,
  Users,
  Sparkles,
  LogOut,
  TrendingUp,
  Activity,
  ShieldCheck,
} from "lucide-react";

interface Metrics {
  institutions: number;
  programs: number;
  users: number;
  ai_generations: number;
}

interface Institution {
  id: string;
  institution_name: string;
  email: string;
  onboarding_status: string;
  shortform: string;
  created_at: string;
}

export default function SuperAdminDashboard() {
  const router = useRouter();
  const [metrics, setMetrics] = useState<Metrics | null>(null);
  const [institutions, setInstitutions] = useState<Institution[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([
      fetch("/api/super-admin/metrics").then((r) => r.json()),
      fetch("/api/super-admin/institutions").then((r) => r.json()),
    ])
      .then(([m, i]) => {
        setMetrics(m);
        setInstitutions(i.institutions || []);
      })
      .catch(() => setError("Failed to load dashboard data."))
      .finally(() => setLoading(false));
  }, []);

  const handleLogout = async () => {
    await fetch("/api/auth/super/login", { method: "DELETE" }).catch(() => {});
    document.cookie = "c2e_auth_token=; Max-Age=0; path=/";
    router.push("/login");
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 text-white">
      {/* Header */}
      <header className="border-b border-white/5 bg-slate-900/60 backdrop-blur-xl sticky top-0 z-40">
        <div className="mx-auto max-w-7xl flex items-center justify-between px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="flex size-9 items-center justify-center rounded-xl bg-gradient-to-br from-violet-500 to-indigo-600 shadow-lg">
              <ShieldCheck className="size-5 text-white" />
            </div>
            <div>
              <p className="text-sm font-black tracking-tight text-white">C2X Plus+</p>
              <p className="text-[10px] font-bold uppercase tracking-widest text-violet-400">
                Super Admin Console
              </p>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-xs font-bold text-slate-300 transition-all hover:bg-red-500/10 hover:border-red-500/30 hover:text-red-400"
          >
            <LogOut className="size-3.5" /> Sign Out
          </button>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-6 py-10 space-y-10">
        {/* Page Title */}
        <div>
          <h1 className="text-3xl font-black tracking-tight text-white">
            Platform Overview
          </h1>
          <p className="mt-1 text-sm text-slate-400">
            Real-time insights across all institutions on the C2X platform.
          </p>
        </div>

        {/* Metrics */}
        {loading ? (
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            {[...Array(4)].map((_, i) => (
              <div
                key={i}
                className="h-32 rounded-2xl bg-white/5 animate-pulse border border-white/5"
              />
            ))}
          </div>
        ) : error ? (
          <div className="rounded-2xl border border-red-500/20 bg-red-500/10 p-6 text-sm text-red-400">
            {error}
          </div>
        ) : metrics ? (
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            {[
              {
                label: "Institutions",
                value: metrics.institutions,
                icon: Building2,
                color: "from-blue-500 to-indigo-600",
                glow: "shadow-blue-500/20",
              },
              {
                label: "Programs",
                value: metrics.programs,
                icon: GraduationCap,
                color: "from-violet-500 to-purple-600",
                glow: "shadow-violet-500/20",
              },
              {
                label: "Users",
                value: metrics.users,
                icon: Users,
                color: "from-emerald-500 to-teal-600",
                glow: "shadow-emerald-500/20",
              },
              {
                label: "AI Generations",
                value: metrics.ai_generations,
                icon: Sparkles,
                color: "from-amber-500 to-orange-600",
                glow: "shadow-amber-500/20",
              },
            ].map(({ label, value, icon: Icon, color, glow }) => (
              <div
                key={label}
                className="relative overflow-hidden rounded-2xl border border-white/10 bg-white/5 p-6 backdrop-blur-sm"
              >
                <div
                  className={`absolute -top-4 -right-4 flex size-16 items-center justify-center rounded-full bg-gradient-to-br ${color} opacity-20 blur-xl`}
                />
                <div
                  className={`mb-4 inline-flex size-10 items-center justify-center rounded-xl bg-gradient-to-br ${color} shadow-lg ${glow}`}
                >
                  <Icon className="size-5 text-white" />
                </div>
                <p className="text-3xl font-black text-white">
                  {value.toLocaleString()}
                </p>
                <p className="mt-1 text-xs font-bold uppercase tracking-widest text-slate-400">
                  {label}
                </p>
              </div>
            ))}
          </div>
        ) : null}

        {/* Institutions Table */}
        <div className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur-sm overflow-hidden">
          <div className="flex items-center justify-between border-b border-white/5 px-6 py-4">
            <div className="flex items-center gap-3">
              <Activity className="size-4 text-violet-400" />
              <h2 className="text-sm font-black text-white">All Institutions</h2>
            </div>
            <span className="rounded-full border border-violet-500/30 bg-violet-500/10 px-3 py-1 text-[10px] font-bold uppercase tracking-widest text-violet-400">
              {institutions.length} Total
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-white/5 bg-white/[0.02]">
                  {["Institution", "Short Form", "Email", "Status", "Joined"].map(
                    (h) => (
                      <th
                        key={h}
                        className="px-6 py-3 text-left text-[10px] font-bold uppercase tracking-widest text-slate-500"
                      >
                        {h}
                      </th>
                    )
                  )}
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-8 text-center text-sm text-slate-500">
                      Loading...
                    </td>
                  </tr>
                ) : institutions.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-8 text-center text-sm text-slate-500">
                      No institutions registered yet.
                    </td>
                  </tr>
                ) : (
                  institutions.map((inst) => (
                    <tr
                      key={inst.id}
                      className="border-b border-white/[0.03] transition-colors hover:bg-white/[0.03]"
                    >
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-blue-500 to-indigo-600 text-xs font-black text-white">
                            {(inst.shortform || inst.institution_name?.charAt(0) || "?").toUpperCase().slice(0, 2)}
                          </div>
                          <span className="text-sm font-semibold text-white">
                            {inst.institution_name}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <code className="rounded-md bg-white/10 px-2 py-0.5 text-xs font-bold text-violet-300">
                          {inst.shortform || "—"}
                        </code>
                      </td>
                      <td className="px-6 py-4 text-sm text-slate-400">{inst.email}</td>
                      <td className="px-6 py-4">
                        <span
                          className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-widest ${
                            inst.onboarding_status === "COMPLETE"
                              ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                              : "bg-amber-500/10 text-amber-400 border border-amber-500/20"
                          }`}
                        >
                          <span
                            className={`size-1.5 rounded-full ${
                              inst.onboarding_status === "COMPLETE"
                                ? "bg-emerald-400"
                                : "bg-amber-400 animate-pulse"
                            }`}
                          />
                          {inst.onboarding_status || "PENDING"}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm text-slate-500">
                        {inst.created_at
                          ? new Date(inst.created_at).toLocaleDateString("en-IN", {
                              day: "2-digit",
                              month: "short",
                              year: "numeric",
                            })
                          : "—"}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Quick Links */}
        <div className="flex items-center gap-4 flex-wrap">
          <a
            href="/institution/login"
            className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-5 py-3 text-sm font-semibold text-slate-300 transition-all hover:bg-white/10 hover:text-white"
          >
            <TrendingUp className="size-4 text-violet-400" />
            Back to Institution Login
          </a>
        </div>
      </main>
    </div>
  );
}
