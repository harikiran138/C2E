'use client';

import React from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { motion } from 'framer-motion';

interface ActivityItem {
  id: string;
  user: {
    name: string;
    avatar: string;
    initials: string;
  };
  action: string;
  target: string;
  timestamp: string;
  type: 'purchase' | 'signup' | 'update' | 'comment' | 'survey' | 'program';
}

interface RecentActivityProps {
  activities?: ActivityItem[];
}

export default function RecentActivity({ activities: propActivities }: RecentActivityProps) {
  const getActivityColor = (type: string) => {
    // ... existing logic ...
    switch (type) {
      case 'program':
        return 'bg-blue-500/10 text-blue-500 border-blue-500/20';
      case 'survey':
        return 'bg-purple-500/10 text-purple-500 border-purple-500/20';
      case 'update':
        return 'bg-amber-500/10 text-amber-500 border-amber-500/20';
      default:
        return 'bg-primary/10 text-primary border-primary/20';
    }
  };

  const defaultActivities: ActivityItem[] = [
    { id: '1', user: { name: 'Sarah Johnson', avatar: '', initials: 'SJ' }, action: 'added a new program', target: 'B.Tech CSE', timestamp: '2 hours ago', type: 'program' },
    { id: '2', user: { name: 'Michael Chen', avatar: '', initials: 'MC' }, action: 'submitted survey', target: 'Course Feedback', timestamp: '4 hours ago', type: 'survey' },
    { id: '3', user: { name: 'Emily Rodriguez', avatar: '', initials: 'ER' }, action: 'updated profile', target: 'Settings', timestamp: '1 day ago', type: 'update' },
  ];

  const activities = propActivities || defaultActivities;

  return (
    <Card className="col-span-1 border-border/40 bg-background/40 backdrop-blur-xl relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-transparent" />
      <div className="relative">
        <div className="border-b border-border/40 p-6 pb-4">
          <div className="flex items-center justify-between">
            <h3 className="text-xl font-semibold text-foreground">Recent Activity</h3>
            <Badge variant="secondary" className="bg-primary/10 text-primary">Live</Badge>
          </div>
        </div>
        <CardContent className="pt-4">
            <ScrollArea className="h-[350px] pr-4">
            <div className="space-y-4">
                {activities.map((activity, idx) => (
                <motion.div 
                    key={activity.id}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: idx * 0.05 }}
                    whileHover={{ x: 5 }}
                    className="group relative flex items-start gap-4 rounded-lg border border-border/40 bg-background/60 p-4 backdrop-blur-sm transition-all hover:border-primary/40 hover:bg-background/80 hover:shadow-lg hover:shadow-primary/5"
                >
                    <Avatar className="h-10 w-10 border-2 border-border/40 group-hover:border-primary/40 transition-colors">
                    <AvatarImage src={activity.user.avatar} alt={activity.user.name} />
                    <AvatarFallback className="bg-primary/10 text-primary">
                        {activity.user.initials}
                    </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 space-y-1">
                    <div className="flex items-start justify-between gap-2">
                        <p className="text-sm text-foreground">
                        <span className="font-semibold">{activity.user.name}</span>{' '}
                        <span className="text-muted-foreground">{activity.action}</span>{' '}
                        <span className="font-medium text-primary/80">{activity.target}</span>
                        </p>
                        <Badge variant="outline" className={`shrink-0 text-[10px] ${getActivityColor(activity.type)}`}>
                        {activity.type}
                        </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground">{activity.timestamp}</p>
                    </div>
                </motion.div>
                ))}
            </div>
            </ScrollArea>
        </CardContent>
      </div>
    </Card>
  );
}
