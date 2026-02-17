'use client';

import { useEffect, useState } from 'react';
import InstitutionWorkspace from '@/components/institution/workspace/InstitutionWorkspace';
import Stats from '@/components/institution/dashboard/Stats';
import RecentActivity from '@/components/institution/dashboard/RecentActivity';
import PerformanceChart from '@/components/institution/dashboard/PerformanceChart';
import { Loader2 } from 'lucide-react';
import * as Icons from 'lucide-react';

import { motion, Variants } from 'framer-motion';

const container: Variants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1
    }
  }
};

const item: Variants = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0, transition: { duration: 0.4, ease: "easeOut" } }
};

import { useInstitution } from '@/context/InstitutionContext';

export default function Dashboard() {
  const { institution, selectedProgram } = useInstitution();
  const [loading, setLoading] = useState(true);
  const [statsData, setStatsData] = useState<any>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const url = selectedProgram?.id 
          ? `/api/institution/dashboard?programId=${selectedProgram.id}` 
          : '/api/institution/dashboard';
          
        const res = await fetch(url);
        if (res.ok) {
          const data = await res.json();
          setStatsData(data);
        }
      } catch (error) {
        console.error("Failed to fetch dashboard data", error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [selectedProgram?.id]);

  return (
    <InstitutionWorkspace
      title="Dashboard"
      subtitle="Overview of your institution's performance and curriculum status."
      activeStepKey="dashboard"
    >
      <div className="space-y-8">
        {loading ? (
             <div className="flex h-64 items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
             </div>
        ) : (
             <motion.div 
               variants={container}
               initial="hidden"
               animate="show"
               className="space-y-10"
             >
                <motion.div variants={item} className="flex flex-col md:flex-row md:items-end justify-between gap-6">
                  <div>
                    <h2 className="text-3xl lg:text-5xl font-black tracking-tight text-foreground">
                      Welcome back,<br />
                      <span className="text-primary">{statsData?.institutionName || 'Institution'}</span>
                    </h2>
                    <p className="mt-4 text-muted-foreground flex items-center gap-2">
                       <span className="inline-block size-2 rounded-full bg-emerald-500 animate-pulse" />
                       System is synchronized with the database.
                    </p>
                  </div>
                  <div className="flex items-center gap-4 bg-card/30 backdrop-blur-xl border border-border/40 p-2 rounded-2xl">
                     <div className="px-4 py-2 text-right">
                        <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Local Time</p>
                        <p className="text-sm font-bold tabular-nums">{new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                     </div>
                     <div className="size-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
                        <Icons.Clock className="size-5" />
                     </div>
                  </div>
                </motion.div>

                {/* Institute Context / Connect Section */}
                <motion.div variants={item} className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="bg-card/40 backdrop-blur-xl border border-border/50 rounded-3xl p-8 relative overflow-hidden group hover:border-primary/30 transition-all">
                    <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                      <Icons.Target className="size-24 -mr-8 -mt-8" />
                    </div>
                    <div className="relative z-10">
                      <div className="flex items-center gap-2 mb-4">
                        <div className="p-2 bg-primary/10 rounded-lg text-primary">
                          <Icons.Target className="size-4" />
                        </div>
                        <h3 className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Institute Vision</h3>
                      </div>
                      <p className="text-lg font-medium leading-relaxed italic text-foreground/90">
                        {statsData?.vision ? `"${statsData.vision}"` : "Vision statement not yet defined."}
                      </p>
                    </div>
                  </div>

                  <div className="bg-card/40 backdrop-blur-xl border border-border/50 rounded-3xl p-8 relative overflow-hidden group hover:border-primary/30 transition-all">
                    <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                      <Icons.Sparkles className="size-24 -mr-8 -mt-8" />
                    </div>
                    <div className="relative z-10">
                      <div className="flex items-center gap-2 mb-4">
                        <div className="p-2 bg-indigo-500/10 rounded-lg text-indigo-500">
                          <Icons.Sparkles className="size-4" />
                        </div>
                        <h3 className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Institute Mission</h3>
                      </div>
                      <p className="text-lg font-medium leading-relaxed italic text-foreground/90">
                        {statsData?.mission ? `"${statsData.mission}"` : "Mission statement not yet defined."}
                      </p>
                    </div>
                  </div>
                </motion.div>

                <motion.div variants={item}>
                  <Stats data={statsData} />
                </motion.div>

                <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
                  <motion.div className="lg:col-span-2" variants={item}>
                    <PerformanceChart />
                  </motion.div>
                  <motion.div variants={item}>
                    <RecentActivity activities={statsData?.recentActivities} />
                  </motion.div>
                </div>
            </motion.div>
        )}
      </div>
    </InstitutionWorkspace>
  );
}
