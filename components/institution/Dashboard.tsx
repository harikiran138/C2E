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

export default function Dashboard() {
  const { institution, selectedProgram } = useInstitution();
  const [loading, setLoading] = useState(true);
  const [statsData, setStatsData] = useState<any>(null);

  const fetchData = async () => {
    setLoading(true);
    try {
      const url = selectedProgram?.id 
        ? `/api/institution/dashboard?programId=${selectedProgram.id}` 
        : '/api/institution/dashboard';
      
      console.log(`Dashboard: Fetching data from URL: ${url}`);
        
      const res = await fetch(url);
      console.log(`Dashboard: Fetch response status: ${res.status}`);

      if (res.ok) {
        const data = await res.json();
        setStatsData(data);
      } else {
        console.error(`Dashboard: Fetch failed with status: ${res.status} ${res.statusText}`);
        try {
            const errorText = await res.text();
            console.error(`Dashboard: Error response body: ${errorText}`);
        } catch (e) {
            console.error('Dashboard: Could not read error body');
        }
      }
    } catch (error) {
      console.error("Dashboard: Failed to fetch dashboard data (Network/Client Error)", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [selectedProgram?.id]);

  // Determine Title and Subtitle based on context
  const pageTitle = selectedProgram 
    ? selectedProgram.program_name 
    : "Institution Dashboard";
    
  const pageSubtitle = selectedProgram
    ? "Manage curriculum, assessments, and outcomes."
    : "";

  const headerContent = !selectedProgram && statsData && (
    <div className="flex-1 max-w-4xl">
      <EditableVisionMission 
        initialVision={statsData.vision}
        initialMission={statsData.mission}
        onUpdate={fetchData}
      />
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
                    selectedProgramId={selectedProgram.id}
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
