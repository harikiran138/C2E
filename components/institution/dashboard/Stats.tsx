'use client';

import React from 'react';
import { Card } from '@/components/ui/card';
import { motion } from 'framer-motion';
import { TrendingUp, TrendingDown, Layers, Users, FileText, Star } from 'lucide-react';

interface StatsProps {
  data?: {
    totalPrograms: number;
    pacMembers: number;
    bosMembers: number;
    academicCouncilMembers: number;
    activeStudents: number;
    totalResponses: number;
    avgRating: number;
  };
}

export default function Stats({ data }: StatsProps) {
  const stats = [
    {
      title: 'Total Programs',
      value: data?.totalPrograms || 0,
      icon: <Layers className="h-8 w-8" />,
      change: 2,
      trend: 'up' as const,
    },
    {
      title: 'Academic Council',
      value: data?.academicCouncilMembers || 0,
      icon: <Users className="h-8 w-8" />,
      change: 0,
      trend: 'up' as const,
    },
    {
      title: 'OBE Framework',
      value: 'Enabled', // Placeholder or derived from data
      icon: <FileText className="h-8 w-8" />,
      change: 0,
      trend: 'up' as const,
    },
  ];

  return (
    <div className="grid gap-6 grid-cols-1 md:grid-cols-3">
      {stats.map((stat, i) => (
        <motion.div
            key={i}
            whileHover={{ y: -5 }}
            transition={{ type: "spring", stiffness: 400, damping: 25 }}
            className="h-full"
        >
            <Card className="relative h-full overflow-hidden border-border/60 bg-white/50 hover:bg-white transition-all duration-300 shadow-sm hover:shadow-lg hover:border-indigo-100 flex flex-col justify-between p-6 rounded-xl">
               <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center justify-center p-2.5 rounded-lg bg-indigo-50 text-indigo-600 group-hover:bg-indigo-600 group-hover:text-white transition-colors">
                        {React.isValidElement(stat.icon) && React.cloneElement(stat.icon as React.ReactElement<any>, { className: 'h-5 w-5' })}
                    </div>
                    {/* Badge or Trend could go here if aligned top right. 
                        The prompt asks: "Make icon aligned top-right consistently." 
                        Okay, let's swap: Title/Value left, Icon right.
                    */}
               </div>
               
               <div>
                   <div className="flex items-center justify-between">
                        <div>
                             <p className="text-sm font-medium text-slate-500 mb-1">{stat.title}</p>
                             <h3 className="text-3xl font-semibold text-slate-900 tracking-tight">{stat.value}</h3>
                        </div>
                        {/* Icon shifted to top-right (absolute or flex) - let's adhere to "flex flex-col justify-between" and clean layout.
                            If I want icon top-right:
                         */}
                   </div>

                    <div className="mt-4 flex items-center gap-2">
                        {stat.trend === 'up' ? (
                            <div className="flex items-center text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full text-[10px] font-bold">
                                <TrendingUp className="h-3 w-3 mr-1" />
                                {stat.change > 0 ? '+' : ''}{stat.change}%
                            </div>
                        ) : (
                            <div className="flex items-center text-red-600 bg-red-50 px-2 py-0.5 rounded-full text-[10px] font-bold">
                                <TrendingDown className="h-3 w-3 mr-1" />
                                {stat.change}%
                            </div>
                        )}
                        <span className="text-xs text-slate-400">vs last month</span>
                    </div>
               </div>
               
                {/* Re-adjusting to strictly follow:
                    "Make icon aligned top-right consistently."
                */}
                <div className="absolute top-6 right-6 p-2 rounded-lg bg-slate-50 text-slate-400">
                     {React.isValidElement(stat.icon) && React.cloneElement(stat.icon as React.ReactElement<any>, { className: 'h-5 w-5' })}
                </div>

            </Card>
        </motion.div>
      ))}
    </div>
  );
}
