'use client';

import { useEffect, useState } from 'react';
import InstitutionWorkspace from '@/components/institution/workspace/InstitutionWorkspace';
import Stats from '@/components/institution/dashboard/Stats';
import RecentActivity from '@/components/institution/dashboard/RecentActivity';
import PerformanceChart from '@/components/institution/dashboard/PerformanceChart';
import { Loader2 } from 'lucide-react';
import * as Icons from 'lucide-react';
import InstitutionDashboardHome from '@/components/institution/dashboard/InstitutionDashboardHome';
import ProgramDashboardHome from '@/components/institution/dashboard/ProgramDashboardHome';

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
      setLoading(true);
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

  // Determine Title and Subtitle based on context
  const pageTitle = selectedProgram 
    ? selectedProgram.program_name 
    : "Institution Dashboard";
    
  const pageSubtitle = selectedProgram
    ? "Manage curriculum, assessments, and outcomes."
    : "Overview of your institution's performance and status.";

  const headerContent = !selectedProgram && statsData && (
    <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center">
        {/* Vision */}
        <div className="flex-1 min-w-0 bg-indigo-50/50 border border-indigo-100 rounded-2xl px-4 py-2.5">
            <div className="flex items-center gap-2 mb-0.5">
                <Icons.Target className="size-3 text-indigo-600" />
                <span className="text-[10px] font-black uppercase tracking-widest text-indigo-400">Vision</span>
            </div>
            <p className="text-sm font-bold text-slate-700 truncate italic">
                {statsData.vision ? `"${statsData.vision}"` : "Leading global transformative education."}
            </p>
        </div>
        {/* Mission */}
        <div className="flex-1 min-w-0 bg-teal-50/50 border border-teal-100 rounded-2xl px-4 py-2.5">
            <div className="flex items-center gap-2 mb-0.5">
                <Icons.Sparkles className="size-3 text-teal-600" />
                <span className="text-[10px] font-black uppercase tracking-widest text-teal-400">Mission</span>
            </div>
            <p className="text-sm font-bold text-slate-700 truncate italic">
                {statsData.mission ? `"${statsData.mission}"` : "Fostering innovation and ethical leadership."}
            </p>
        </div>
    </div>
  );

  return (
    <InstitutionWorkspace
      title={pageTitle}
      subtitle={pageSubtitle}
      activeStepKey="dashboard"
      headerContent={headerContent}
    >
      {loading ? (
           <div className="flex h-64 items-center justify-center">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
           </div>
      ) : (
          <div className="min-h-[600px]">
            {selectedProgram ? (
                <ProgramDashboardHome 
                    statsData={statsData} 
                    loading={loading}
                    programName={selectedProgram.program_name} 
                />
            ) : (
                <InstitutionDashboardHome 
                    statsData={statsData} 
                    loading={loading} 
                />
            )}
          </div>
      )}
    </InstitutionWorkspace>
  );
}
