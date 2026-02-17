'use client';

import React from 'react';
import { motion } from 'framer-motion';
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
    <Card className="col-span-1 lg:col-span-2 border-slate-200/60 bg-white/40 backdrop-blur-xl relative overflow-hidden group transition-all duration-500 hover:shadow-2xl hover:shadow-indigo-500/10 hover:border-indigo-500/30">
      {/* 21st.dev Style Top Beam */}
      <div className="absolute inset-x-0 -top-px h-[2px] bg-gradient-to-r from-transparent via-indigo-500/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
      
      <CardHeader className="border-b border-slate-100/60 pb-6">
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2 mb-1">
                <div className="size-2 rounded-full bg-indigo-500 animate-pulse" />
                <span className="text-[10px] font-bold uppercase tracking-widest text-indigo-500/80">Growth Analytics</span>
            </div>
            <CardTitle className="text-2xl font-extrabold text-slate-800 tracking-tight">Survey Performance</CardTitle>
            <CardDescription className="text-slate-500 font-medium">Monthly engagement & student participation trends</CardDescription>
          </div>
          <motion.div 
            whileHover={{ rotate: 15, scale: 1.1 }}
            className="size-12 rounded-2xl bg-indigo-50 h-12 w-12 flex items-center justify-center text-indigo-600 shadow-sm border border-indigo-100/50"
          >
            <TrendingUp className="size-6" />
          </motion.div>
        </div>
      </CardHeader>
      
      <CardContent className="pt-8 px-2 sm:px-6">
        <div className="h-[320px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="colorResponses" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="#818cf8" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid vertical={false} stroke="#f1f5f9" strokeDasharray="3 3" />
              <XAxis 
                dataKey="name" 
                axisLine={false}
                tickLine={false}
                tick={{ fill: '#94a3b8', fontSize: 11, fontWeight: 600 }}
                dy={15}
              />
              <YAxis 
                axisLine={false}
                tickLine={false}
                tick={{ fill: '#94a3b8', fontSize: 11, fontWeight: 600 }}
              />
              <Tooltip 
                cursor={{ stroke: '#6366f1', strokeWidth: 2, strokeDasharray: '4 4' }}
                content={({ active, payload }) => {
                  if (active && payload && payload.length) {
                    return (
                      <div className="bg-white/95 backdrop-blur-md border border-slate-200 p-3 rounded-xl shadow-xl ring-1 ring-black/5">
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">{payload[0].payload.name}</p>
                        <p className="text-lg font-black text-indigo-600">{payload[0].value} Responses</p>
                      </div>
                    );
                  }
                  return null;
                }}
              />
              <Area 
                type="monotone" 
                dataKey="responses" 
                stroke="#6366f1" 
                strokeWidth={4}
                fillOpacity={1} 
                fill="url(#colorResponses)" 
                animationDuration={2500}
                animationEasing="ease-in-out"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
