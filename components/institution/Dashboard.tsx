'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '../../utils/supabase/client';

export default function Dashboard() {
  const router = useRouter();
  const [userName, setUserName] = useState<string>('Guest');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkUser = async () => {
      const isDemo = localStorage.getItem('isDemo') === 'true';
      if (isDemo) {
        setUserName('Demo User');
        setLoading(false);
        return;
      }

      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push('/institution/login');
        return;
      }
      setUserName(user.email?.split('@')[0] || 'User');
      setLoading(false);
    };
    checkUser();
  }, [router]);

  if (loading) {
    return (
        <div className="min-h-screen flex items-center justify-center bg-white">
            <div className="flex flex-col items-center gap-4">
                <span className="material-symbols-outlined animate-spin text-4xl text-[#137fec]">progress_activity</span>
                <p className="text-slate-500 font-medium">Loading Dashboard...</p>
            </div>
        </div>
    );
  }

  const menuItems = [
    {
      title: 'Institute Profile',
      description: 'Manage basic details, vision, mission, and accreditation status.',
      icon: 'school',
      link: '/institution/details',
      color: 'text-blue-600',
      bg: 'bg-blue-50',
    },
    {
      title: 'Program Management',
      description: 'Add or edit academic programs, courses, and intake details.',
      icon: 'book',
      link: '/institution/programs',
      color: 'text-emerald-600',
      bg: 'bg-emerald-50',
    },
    {
      title: 'PEO Formulation',
      description: 'Define, map, and analyze Program Educational Objectives.',
      icon: 'target',
      link: '/institution/peos',
      color: 'text-purple-600',
      bg: 'bg-purple-50',
    },
    {
      title: 'Feedback Analytics',
      description: 'View stakeholder feedback, survey results, and sentiment analysis.',
      icon: 'analytics',
      link: '/institution/feedback',
      color: 'text-orange-600',
      bg: 'bg-orange-50',
    },
  ];

  return (
    <div className="min-h-screen bg-slate-50 font-sans">
      {/* Top Navigation - White Theme */}
      <nav className="bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between sticky top-0 z-50 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="size-10 bg-slate-100 rounded-xl flex items-center justify-center text-[#137fec] border border-slate-200">
            <span className="material-symbols-outlined text-2xl">grid_view</span>
          </div>
          <div>
            <span className="block font-bold text-lg text-slate-900 leading-none">Institution Portal</span>
            <span className="text-xs text-slate-500 font-medium">Accreditation Management System</span>
          </div>
        </div>
        <div className="flex items-center gap-6">
           <div className="hidden md:flex items-center gap-2 px-3 py-1.5 bg-slate-100 rounded-full border border-slate-200">
                <div className="size-6 bg-white rounded-full flex items-center justify-center shadow-sm">
                    <span className="material-symbols-outlined text-sm text-slate-600">person</span>
                </div>
                <span className="text-sm font-semibold text-slate-700 pr-2">{userName}</span>
           </div>
          <button 
            onClick={() => {
                localStorage.removeItem('isDemo');
                router.push('/institution/login');
            }}
            className="flex items-center gap-2 text-sm font-bold text-slate-600 hover:text-red-600 hover:bg-red-50 px-4 py-2 rounded-xl transition-all border border-transparent hover:border-red-100"
          >
            <span className="material-symbols-outlined text-[18px]">logout</span>
            Logout
          </button>
        </div>
      </nav>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto p-6 lg:p-10">
        <header className="mb-10 flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-slate-900 mb-2 font-serif">Dashboard Overview</h1>
            <p className="text-slate-500 text-lg">Managing compliance and excellence for your institution.</p>
          </div>
          <div className="text-right hidden md:block">
            <p className="text-sm font-bold text-slate-400 uppercase tracking-wider">Current Session</p>
            <p className="text-lg font-bold text-slate-800">2024 - 2025</p>
          </div>
        </header>

        {/* Stats Row */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
             <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
                <div>
                    <p className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-1">Total Programs</p>
                    <p className="text-3xl font-bold text-slate-900">12</p>
                </div>
                <div className="size-12 rounded-full bg-blue-50 flex items-center justify-center text-blue-600">
                    <span className="material-symbols-outlined">school</span>
                </div>
             </div>
             <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
                <div>
                    <p className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-1">Pending Surveys</p>
                    <p className="text-3xl font-bold text-slate-900">145</p>
                </div>
                <div className="size-12 rounded-full bg-orange-50 flex items-center justify-center text-orange-600">
                    <span className="material-symbols-outlined">pending_actions</span>
                </div>
             </div>
             <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
                <div>
                    <p className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-1">Compliance Score</p>
                    <p className="text-3xl font-bold text-slate-900">88%</p>
                </div>
                <div className="size-12 rounded-full bg-emerald-50 flex items-center justify-center text-emerald-600">
                    <span className="material-symbols-outlined">check_circle</span>
                </div>
             </div>
        </div>

        <h2 className="text-xl font-bold text-slate-900 mb-6 flex items-center gap-2">
            <span className="material-symbols-outlined text-slate-400">apps</span>
            Quick Actions
        </h2>

        {/* Menu Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6 mb-10">
          {menuItems.map((item) => (
            <div 
              key={item.title}
              onClick={() => router.push(item.link)}
              className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200 hover:border-blue-200 hover:shadow-lg hover:shadow-blue-500/5 hover:-translate-y-1 transition-all cursor-pointer group flex flex-col h-full"
            >
              <div className={`size-14 ${item.bg} rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300`}>
                <span className={`material-symbols-outlined text-3xl ${item.color}`}>
                  {item.icon}
                </span>
              </div>
              <h3 className="text-lg font-bold text-slate-900 mb-2 group-hover:text-[#137fec] transition-colors">{item.title}</h3>
              <p className="text-sm text-slate-500 leading-relaxed mb-4 flex-grow">{item.description}</p>
              
              <div className="flex items-center text-sm font-bold text-slate-400 group-hover:text-[#137fec] transition-colors mt-auto">
                <span>Access Module</span>
                <span className="material-symbols-outlined text-lg ml-1 group-hover:translate-x-1 transition-transform">arrow_forward</span>
              </div>
            </div>
          ))}
        </div>

        {/* Recent Activity Section */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2 bg-white rounded-2xl p-8 border border-slate-200 shadow-sm">
                <div className="flex items-center justify-between mb-6">
                    <h3 className="font-bold text-lg text-slate-900">Recent Activity</h3>
                    <button className="text-sm font-bold text-[#137fec] hover:underline">View All</button>
                </div>
                <div className="space-y-6">
                    {[1, 2, 3].map((_, i) => (
                        <div key={i} className="flex items-start gap-4 pb-6 border-b border-slate-50 last:border-0 last:pb-0">
                            <div className="size-10 bg-slate-50 rounded-full flex items-center justify-center text-slate-400 shrink-0 mt-1">
                                <span className="material-symbols-outlined text-sm">history</span>
                            </div>
                            <div>
                                <p className="text-sm font-bold text-slate-800">Program details updated for CSE</p>
                                <p className="text-xs text-slate-500 mt-1">Computer Science & Engineering • 2 hours ago</p>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
            
             <div className="bg-gradient-to-br from-[#137fec] to-[#116ecc] rounded-2xl p-8 text-white relative overflow-hidden shadow-lg shadow-blue-500/20 flex flex-col justify-between">
                <div className="relative z-10">
                    <div className="size-12 bg-white/10 rounded-xl flex items-center justify-center mb-6 text-white backdrop-blur-sm">
                        <span className="material-symbols-outlined text-2xl">support_agent</span>
                    </div>
                    <h3 className="font-bold text-xl mb-2">Need Expert Help?</h3>
                    <p className="text-white/80 text-sm mb-8 leading-relaxed">Our accreditation experts are available to assist you with the documentation process.</p>
                    <button className="w-full bg-white text-[#137fec] px-6 py-3.5 rounded-xl text-sm font-bold shadow-lg hover:bg-blue-50 transition-colors">Contact Support</button>
                </div>
                {/* Decorative elements */}
                <div className="absolute top-0 right-0 size-40 bg-white/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2"></div>
                <div className="absolute bottom-0 left-0 size-32 bg-black/10 rounded-full blur-2xl translate-y-1/2 -translate-x-1/2"></div>
            </div>
        </div>

      </main>
    </div>
  );
}
