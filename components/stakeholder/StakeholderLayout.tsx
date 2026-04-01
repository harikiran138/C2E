"use client";

import { useState, useEffect } from "react";
import { StakeholderSidebar } from "./StakeholderSidebar";
import { 
  Menu, 
  X, 
  Bell, 
  Search, 
  HelpCircle,
  ChevronRight,
  Sparkles,
  LayoutDashboard
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

interface StakeholderLayoutProps {
  children: React.ReactNode;
  stakeholder: {
    stakeholderName: string;
    category: string;
    institutionName: string;
    programName: string;
  };
  onLogout: () => void;
  activeView: "validation" | "consultation" | "settings";
  setActiveView: (view: "validation" | "consultation" | "settings") => void;
}

export default function StakeholderLayout({
  children,
  stakeholder,
  onLogout,
  activeView,
  setActiveView,
}: StakeholderLayoutProps) {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 10);
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const viewLabels = {
    validation: "Portal Overview",
    consultation: "PEO Consultation",
    settings: "Account Settings",
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-slate-900 font-sans">
      {/* Mobile Sidebar Overlay */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsMobileMenuOpen(false)}
              className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm lg:hidden"
            />
            <motion.aside
              initial={{ x: "-100%" }}
              animate={{ x: 0 }}
              exit={{ x: "-100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 200 }}
              className="fixed inset-y-0 left-0 z-50 w-[80%] max-w-[320px] bg-white border-r border-slate-200 lg:hidden"
            >
              <StakeholderSidebar
                stakeholderName={stakeholder.stakeholderName}
                category={stakeholder.category}
                onLogout={onLogout}
                view={activeView}
                setView={(v) => {
                  setActiveView(v);
                  setIsMobileMenuOpen(false);
                }}
              />
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      {/* Desktop Sidebar */}
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-[280px] border-r border-slate-200 bg-white lg:block shadow-[2px_0_20px_-10px_rgba(0,0,0,0.05)]">
        <StakeholderSidebar
          stakeholderName={stakeholder.stakeholderName}
          category={stakeholder.category}
          onLogout={onLogout}
          view={activeView}
          setView={setActiveView}
        />
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-w-0 lg:pl-[280px] transition-all duration-300">
        {/* Sticky Header */}
        <header
          className={`sticky top-0 z-20 px-6 py-3 transition-all duration-200 ${
            isScrolled
              ? "bg-white/80 backdrop-blur-xl border-b border-slate-200/50 shadow-sm"
              : "bg-transparent"
          }`}
        >
          <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
            {/* Mobile Toggle */}
            <button
              onClick={() => setIsMobileMenuOpen(true)}
              className="lg:hidden p-2 -ml-2 text-slate-500 hover:text-slate-900"
            >
              <Menu className="size-6" />
            </button>

            {/* Breadcrumb / Title */}
            <div className="flex items-center gap-2 text-xs font-semibold text-slate-400">
                <span className="hover:text-slate-600 cursor-pointer">Dashboard</span>
                <ChevronRight className="size-3" />
                <span className="text-slate-900">{viewLabels[activeView]}</span>
            </div>

            {/* Right Actions */}
            <div className="flex items-center gap-3 ml-auto">
              <button className="relative p-2 text-slate-400 hover:text-indigo-600 hover:bg-slate-100 rounded-full transition-colors">
                <Bell className="size-5" />
                <span className="absolute top-2 right-2 size-2 bg-red-500 rounded-full border-2 border-white" />
              </button>

              <div className="h-6 w-px bg-slate-200 hidden sm:block" />

              <div className="flex items-center gap-3 pl-1">
                <div className="text-right hidden sm:block">
                  <p className="text-sm font-bold text-slate-900 leading-none">
                    {stakeholder.stakeholderName}
                  </p>
                  <p className="text-[10px] text-slate-500 font-medium uppercase tracking-wide">
                    {stakeholder.category}
                  </p>
                </div>
                <Avatar className="size-9 bg-white border border-slate-200 shadow-sm">
                  <AvatarFallback className="bg-gradient-to-br from-indigo-500 to-indigo-700 text-white font-bold text-xs uppercase">
                    {stakeholder.stakeholderName.substring(0, 2)}
                  </AvatarFallback>
                </Avatar>
              </div>
            </div>
          </div>
        </header>

        {/* Page Content Holder */}
        <div className="flex-1 p-6 lg:p-10 max-w-7xl mx-auto w-full">
           <AnimatePresence mode="wait">
              <motion.div
                key={activeView}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.3 }}
                className="w-full"
              >
                {children}
              </motion.div>
            </AnimatePresence>
        </div>
      </main>
    </div>
  );
}
