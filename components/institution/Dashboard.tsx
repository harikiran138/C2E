'use client';

import { useEffect, useState, useCallback, useMemo, memo } from 'react';
import useSWR from 'swr';
import InstitutionWorkspace from '@/components/institution/workspace/InstitutionWorkspace';
import Stats from '@/components/institution/dashboard/Stats';
import RecentActivity from '@/components/institution/dashboard/RecentActivity';
import PerformanceChart from '@/components/institution/dashboard/PerformanceChart';
import { Loader2 } from 'lucide-react';
import * as Icons from 'lucide-react';
import InstitutionDashboardHome from '@/components/institution/dashboard/InstitutionDashboardHome';
import ProgramDashboardHome from '@/components/institution/dashboard/ProgramDashboardHome';
import EditableVisionMission from '@/components/institution/dashboard/EditableVisionMission';

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

const fetcher = (url: string) => fetch(url).then(res => res.json());

const Dashboard = memo(function Dashboard() {
  const { institution, selectedProgram } = useInstitution();
  
  const apiUrl = useMemo(() => {
    return selectedProgram?.id 
      ? `/api/institution/dashboard?programId=${selectedProgram.id}` 
      : '/api/institution/dashboard';
  }, [selectedProgram?.id]);

  const { data: statsData, error, isLoading, mutate } = useSWR(apiUrl, fetcher, {
    revalidateOnFocus: false,
    dedupingInterval: 10000, // 10 seconds
  });

  const handleUpdate = useCallback(() => {
    mutate();
  }, [mutate]);

  // Determine Title and Subtitle based on context
  const pageTitle = selectedProgram 
    ? selectedProgram.program_name 
    : "Institution Dashboard";
    
  const pageSubtitle = selectedProgram
    ? "Manage curriculum, assessments, and outcomes."
    : "";

  const headerContent = useMemo(() => {
    if (!selectedProgram && statsData) {
      return (
        <div className="flex-1 max-w-4xl">
          <EditableVisionMission 
            initialVision={statsData.vision}
            initialMission={statsData.mission}
            onUpdate={handleUpdate}
          />
        </div>
      );
    }
    return null;
  }, [selectedProgram, statsData, handleUpdate]);

  if (error) {
    return (
      <InstitutionWorkspace title={pageTitle} subtitle={pageSubtitle} activeStepKey="dashboard">
        <div className="flex h-64 flex-col items-center justify-center space-y-4">
          <p className="text-red-500 font-medium">Failed to load dashboard data.</p>
          <button 
            onClick={() => mutate()}
            className="px-4 py-2 bg-primary text-white rounded-md hover:bg-primary/90 transition-colors"
          >
            Retry
          </button>
        </div>
      </InstitutionWorkspace>
    );
  }

  return (
    <InstitutionWorkspace
      title={pageTitle}
      subtitle={pageSubtitle}
      activeStepKey="dashboard"
      headerContent={headerContent}
    >
      {isLoading ? (
           <div className="flex h-64 items-center justify-center">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
           </div>
      ) : (
          <div className="min-h-[600px]">
            {selectedProgram ? (
                <ProgramDashboardHome 
                    statsData={statsData} 
                    loading={isLoading}
                    programName={selectedProgram.program_name} 
                    selectedProgramId={selectedProgram.id}
                />
            ) : (
                <InstitutionDashboardHome 
                    statsData={statsData} 
                    loading={isLoading} 
                />
            )}
          </div>
      )}
    </InstitutionWorkspace>
  );
});

export default Dashboard;
