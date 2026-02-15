'use client';

import React from 'react';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
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
    <Card className="col-span-1 lg:col-span-2 bg-white/60 border-slate-200 shadow-sm">
      <CardHeader>
        <CardTitle>Survey Responses</CardTitle>
        <CardDescription>Monthly student participation trends</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="h-[350px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="colorResponses" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.8}/>
                  <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <XAxis dataKey="name" stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} />
              <YAxis stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(value) => `${value}`} />
              <Tooltip 
                contentStyle={{ backgroundColor: '#fff', borderRadius: '8px', border: '1px solid #e2e8f0' }}
                itemStyle={{ color: '#1e293b' }}
              />
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
              <Area type="monotone" dataKey="responses" stroke="#8b5cf6" fillOpacity={1} fill="url(#colorResponses)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
