'use client';

import React from 'react';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { TrendingUp } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

const data = [
  { name: 'Jan', responses: 40 },
  { name: 'Feb', responses: 30 },
  { name: 'Mar', responses: 20 },
  { name: 'Apr', responses: 27 },
  { name: 'May', responses: 18 },
  { name: 'Jun', responses: 23 },
  { name: 'Jul', responses: 34 },
];

export default function PerformanceChart() {
  return (
    <Card className="col-span-1 lg:col-span-2 border-border/40 bg-background/40 backdrop-blur-xl relative overflow-hidden group transition-all hover:border-primary/40">
      <div className="absolute inset-x-0 -top-px h-px bg-gradient-to-r from-transparent via-primary/40 to-transparent" />
      <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-transparent pointer-events-none" />
      <CardHeader className="relative">
        <div className="flex items-center justify-between">
            <div>
                <CardTitle className="text-xl font-bold">Survey Responses</CardTitle>
                <CardDescription className="text-muted-foreground/80">Monthly student participation trends</CardDescription>
            </div>
            <div className="size-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary group-hover:scale-110 transition-transform">
                <TrendingUp className="size-5" />
            </div>
        </div>
      </CardHeader>
      <CardContent className="relative">
        <div className="h-[350px] w-full mt-4">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="colorResponses" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="var(--primary)" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="var(--primary)" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" strokeOpacity={0.4} />
              <XAxis 
                dataKey="name" 
                stroke="var(--muted-foreground)" 
                fontSize={10} 
                tickLine={false} 
                axisLine={false} 
                dy={10}
                className="font-bold uppercase tracking-wider"
              />
              <YAxis 
                stroke="var(--muted-foreground)" 
                fontSize={10} 
                tickLine={false} 
                axisLine={false} 
                tickFormatter={(value) => `${value}`}
                className="font-bold"
              />
              <Tooltip 
                contentStyle={{ 
                    backgroundColor: 'rgba(var(--background), 0.8)', 
                    backdropFilter: 'blur(12px)',
                    borderRadius: '1rem', 
                    border: '1px solid var(--border)',
                    boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)'
                }}
                itemStyle={{ color: 'var(--foreground)', fontSize: '12px', fontWeight: 'bold' }}
                cursor={{ stroke: 'var(--primary)', strokeWidth: 2, strokeDasharray: '4 4' }}
              />
              <Area 
                type="monotone" 
                dataKey="responses" 
                stroke="var(--primary)" 
                strokeWidth={3}
                fillOpacity={1} 
                fill="url(#colorResponses)" 
                animationDuration={2000}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
