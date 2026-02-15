'use client';

import React from 'react';
import { Card } from '@/components/ui/card';
import { TrendingUp, TrendingDown, Layers, Users, FileText, Star } from 'lucide-react';

interface StatsProps {
  data?: {
    totalPrograms: number;
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
      color: 'blue',
    },
    {
      title: 'Active Students',
      value: data?.activeStudents || 0,
      icon: <Users className="h-8 w-8" />,
      change: 12.5,
      trend: 'up' as const,
      color: 'emerald',
    },
    {
      title: 'Survey Responses',
      value: data?.totalResponses || 0,
      icon: <FileText className="h-8 w-8" />,
      change: 5.7,
      trend: 'up' as const,
      color: 'purple',
    },
    {
      title: 'Avg. Rating',
      value: data?.avgRating ? data.avgRating.toFixed(1) : '0.0',
      icon: <Star className="h-8 w-8" />,
      change: -0.1,
      trend: 'down' as const,
      color: 'amber',
    },
  ];

  return (
    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
      {stats.map((stat, i) => (
        <Card key={i} className="relative overflow-hidden border-border/40 bg-background/40 backdrop-blur-xl group transition-all hover:border-primary/40">
           <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-transparent" />
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
                            <span className="text-sm text-muted-foreground ml-1">vs last month</span>
                        </div>
                    </div>
                    <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10 text-primary backdrop-blur-sm group-hover:scale-110 transition-transform">
                        {stat.icon}
                    </div>
                </div>
           </div>
        </Card>
      ))}
    </div>
  );
}
