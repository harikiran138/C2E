'use client';

import React from 'react';
import { Card } from '@/components/ui/card';
import { motion } from 'framer-motion';
import { 
  GraduationCap, 
  Users, 
  Award, 
  BookOpen, 
  Sparkles
} from 'lucide-react';

interface InstitutionStatsProps {
  data?: {
    totalPrograms: number;
    academicCouncilMembers: number;
    activeStudents: number;
  };
}

const cn = (...classes: (string | boolean | undefined)[]) => classes.filter(Boolean).join(' ');

export default function InstitutionStats({ data }: InstitutionStatsProps) {
  const stats = [
    {
      label: 'Active Programs',
      value: data?.totalPrograms || 0,
      icon: BookOpen,
      color: 'indigo',
      trend: '+2 this year',
      sparkline: [30, 45, 35, 60, 50, 75, 70]
    },
    {
      label: 'Total Students',
      value: data?.activeStudents || '1,240',
      icon: GraduationCap,
      color: 'emerald',
      trend: '+12% vs last sem',
      sparkline: [40, 55, 45, 70, 65, 85, 95]
    },
    {
      label: 'Academic Council',
      value: data?.academicCouncilMembers || 0,
      icon: Users,
      color: 'violet',
      trend: 'Active',
      sparkline: [20, 20, 25, 25, 30, 30, 30]
    },
    {
      label: 'Accreditation',
      value: 'NBA Tier-1', 
      icon: Award,
      color: 'amber',
      trend: 'Valid til 2028',
      sparkline: [100, 100, 100, 100, 100, 100, 100]
    }
  ];

  const colorVariants: Record<string, string> = {
    indigo: 'text-indigo-600 bg-indigo-50 border-indigo-100',
    emerald: 'text-emerald-600 bg-emerald-50 border-emerald-100',
    violet: 'text-violet-600 bg-violet-50 border-violet-100',
    amber: 'text-amber-600 bg-amber-50 border-amber-100',
  };

  const glowVariants: Record<string, string> = {
    indigo: 'group-hover:shadow-indigo-500/10 group-hover:border-indigo-200',
    emerald: 'group-hover:shadow-emerald-500/10 group-hover:border-emerald-200',
    violet: 'group-hover:shadow-violet-500/10 group-hover:border-violet-200',
    amber: 'group-hover:shadow-amber-500/10 group-hover:border-amber-200',
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      {stats.map((stat, i) => (
        <motion.div
          key={i}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: i * 0.1 }}
          className="group h-full"
        >
          <Card className={cn(
            "relative h-full p-6 bg-white/40 backdrop-blur-xl border border-slate-200/60 shadow-sm transition-all duration-500 rounded-[2rem]",
            glowVariants[stat.color]
          )}>
            <div className="absolute inset-0 bg-gradient-to-br from-white/40 to-white/10 pointer-events-none" />
            
            <div className="relative z-10 flex flex-col gap-6">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 group-hover:text-slate-600 transition-colors duration-300">
                  {stat.label}
                </span>
                <div className={cn("p-3 rounded-2xl shadow-lg shadow-indigo-50 transition-all duration-500 group-hover:scale-110", colorVariants[stat.color])}>
                  <stat.icon className="w-5 h-5" />
                </div>
              </div>

              <div className="flex flex-col gap-4 mt-2">
                <div className="flex items-baseline justify-between mb-2">
                    <span className="text-4xl font-black text-slate-900 tracking-tight leading-none">
                      {stat.value}
                    </span>
                    <div className="w-20 h-10 overflow-visible">
                        <svg viewBox="0 0 100 40" preserveAspectRatio="none" className="w-full h-full">
                            <defs>
                                <linearGradient id={`grad-${i}`} x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="0%" stopColor="currentColor" stopOpacity="0.4" />
                                    <stop offset="100%" stopColor="currentColor" stopOpacity="0" />
                                </linearGradient>
                            </defs>
                            <path
                                d={`M 0 ${40 - stat.sparkline[0]} ${stat.sparkline.map((val, idx) => `L ${(idx * 100) / (stat.sparkline.length - 1)} ${40 - val}`).join(' ')}`}
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="3"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                className={cn("transition-all duration-700", stat.color === 'indigo' ? 'text-indigo-500' : stat.color === 'emerald' ? 'text-emerald-500' : stat.color === 'violet' ? 'text-violet-500' : 'text-amber-500')}
                            />
                        </svg>
                    </div>
                </div>

                <div className={cn(
                    "inline-flex items-center gap-2 px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest w-fit border transition-all duration-300",
                    colorVariants[stat.color]
                )}>
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>{stat.trend}</span>
                </div>
              </div>
            </div>
          </Card>
        </motion.div>
      ))}
    </div>
  );
}
