"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";
import {
  LayoutDashboard,
  FileText,
  Settings,
  LogOut,
  ChevronRight,
  ShieldCheck,
  Calendar,
} from "lucide-react";

interface StakeholderSidebarProps {
  stakeholderName: string;
  category: string;
  onLogout: () => void;
  view: "validation" | "consultation" | "settings";
  setView: (view: "validation" | "consultation" | "settings") => void;
}

export function StakeholderSidebar({
  stakeholderName,
  category,
  onLogout,
  view,
  setView,
}: StakeholderSidebarProps) {
  const menuItems = [
    {
      id: "validation",
      label: "Portal Overview",
      icon: LayoutDashboard,
      description: "Vision & Mission Feedback",
    },
    {
      id: "consultation",
      label: "PEO Consultation",
      icon: FileText,
      description: "Direct Surveys & Input",
    },
    {
      id: "settings",
      label: "Account Settings",
      icon: Settings,
      description: "Security & Password",
    },
  ] as const;

  return (
    <div className="flex h-full flex-col p-6">
      {/* Brand */}
      <div className="flex items-center gap-3 mb-10 px-2">
        <div className="size-10 rounded-xl bg-indigo-600 flex items-center justify-center text-white font-black italic text-xl shadow-lg shadow-indigo-200">
          C
        </div>
        <div className="flex flex-col">
          <span className="font-bold text-slate-900 leading-tight">C2X Portal</span>
          <span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Stakeholder Hub</span>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 space-y-2">
        <div className="px-2 mb-4">
           <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Main Menu</p>
        </div>
        
        {menuItems.map((item) => {
          const isActive = view === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setView(item.id)}
              className={cn(
                "group w-full flex items-start gap-3 px-4 py-3 rounded-2xl transition-all duration-300 relative text-xs font-semibold",
                isActive
                  ? "bg-white shadow-xl shadow-slate-200/50 text-slate-900 border border-slate-100 ring-1 ring-slate-900/5"
                  : "text-slate-500 hover:bg-slate-50 hover:text-slate-900"
              )}
            >
              {isActive && (
                <motion.div
                  layoutId="sidebar-active-pill"
                  className="absolute left-0 bottom-3 top-3 w-1 bg-indigo-600 rounded-full"
                />
              )}
              <div
                className={cn(
                  "size-9 flex items-center justify-center rounded-xl transition-all duration-300 shrink-0",
                  isActive
                    ? "bg-indigo-600 text-white shadow-lg shadow-indigo-200 scale-110"
                    : "bg-slate-50 text-slate-400 group-hover:bg-indigo-600 group-hover:text-white group-hover:scale-105"
                )}
              >
                <item.icon className="size-4" />
              </div>
              <div className="flex flex-col gap-0.5 pt-0.5 text-left min-w-0">
                <span className="leading-tight truncate">{item.label}</span>
                <span className="text-[10px] text-slate-400 font-normal leading-tight truncate">
                  {item.description}
                </span>
              </div>
            </button>
          );
        })}
      </nav>

      {/* User Card */}
      <div className="mt-auto pt-6 border-t border-slate-100">
        <div className="rounded-2xl bg-slate-50 p-4 border border-slate-100">
          <div className="flex items-center gap-3">
            <div className="size-10 rounded-full bg-gradient-to-br from-indigo-500 to-indigo-700 flex items-center justify-center text-white text-xs font-bold">
              {stakeholderName.substring(0, 2).toUpperCase()}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-bold text-slate-900 truncate">{stakeholderName}</p>
              <p className="text-[10px] text-slate-500 font-medium uppercase tracking-wide">{category}</p>
            </div>
          </div>
          
          <button
            onClick={onLogout}
            className="mt-4 flex items-center justify-center gap-2 w-full px-3 py-2 rounded-xl text-xs font-bold text-red-600 bg-white border border-red-50 hover:bg-red-50 transition-colors"
          >
            <LogOut className="size-3.5" />
            Sign Out
          </button>
        </div>
      </div>
    </div>
  );
}
