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
      title: 'Prg. Advi. Committee',
      value: data?.pacMembers || 0,
      icon: <Users className="h-8 w-8" />,
      change: 0,
      trend: 'up' as const,
    },
    {
      title: 'BoS Members',
      value: data?.bosMembers || 0,
      icon: <FileText className="h-8 w-8" />,
      change: 0,
      trend: 'up' as const,
    },
    {
      title: 'Academic Council',
      value: data?.academicCouncilMembers || 0,
      icon: <Star className="h-8 w-8" />,
      change: 0,
      trend: 'up' as const,
    },
  ];

  return (
    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
      {stats.map((stat, i) => (
        <motion.div
            key={i}
            whileHover={{ y: -5, scale: 1.01 }}
            transition={{ type: "spring", stiffness: 400, damping: 25 }}
        >
            <Card className="relative h-full overflow-hidden border-border/40 bg-background/40 backdrop-blur-xl group transition-all hover:border-primary/40 hover:shadow-2xl hover:shadow-primary/5">
               <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-transparent pointer-events-none" />
               <div className="relative p-6">
                    <div className="flex items-center justify-between">
                        <div className="flex-1">
                            <p className="text-sm font-medium text-muted-foreground">{stat.title}</p>
                            <h3 className="mt-2 text-3xl font-bold text-foreground">{stat.value}</h3>
                            <div className="mt-2 flex items-center gap-1">
                                {stat.trend === 'up' ? (
                                    <TrendingUp className="h-4 w-4 text-emerald-500" />
                                ) : (
                                    <TrendingDown className="h-4 w-4 text-red-500" />
                                )}
                                <span className={`text-sm font-medium ${stat.trend === 'up' ? 'text-emerald-500' : 'text-red-500'}`}>
                                    {stat.change > 0 ? '+' : ''}{stat.change}%
                                </span>
                                <span className="text-sm text-muted-foreground ml-1 text-[10px] uppercase">vs last month</span>
                            </div>
                        </div>
                        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary backdrop-blur-sm group-hover:bg-primary group-hover:text-primary-foreground group-hover:scale-110 transition-all duration-300">
                            {React.isValidElement(stat.icon) && React.cloneElement(stat.icon as React.ReactElement<any>, { className: 'h-6 w-6' })}
                        </div>
                    </div>
               </div>
            </Card>
        </motion.div>
      ))}
    </div>
  );
}
