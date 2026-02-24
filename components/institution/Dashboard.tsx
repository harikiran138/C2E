'use client';

import { memo, useCallback } from 'react';
import useSWR from 'swr';
import InstitutionWorkspace from '@/components/institution/workspace/InstitutionWorkspace';
import InstitutionDashboardHome from '@/components/institution/dashboard/InstitutionDashboardHome';
import EditableVisionMission from '@/components/institution/dashboard/EditableVisionMission';
import { Loader2 } from 'lucide-react';

const fetcher = (url: string) => fetch(url).then((res) => res.json());

const Dashboard = memo(function Dashboard() {
  const { data: statsData, error, isLoading, mutate } = useSWR('/api/institution/dashboard', fetcher, {
    revalidateOnFocus: false,
    dedupingInterval: 10000,
  });

  const handleUpdate = useCallback(() => {
    mutate();
  }, [mutate]);

  const headerContent = statsData ? (
    <div className="flex-1 max-w-4xl">
      <EditableVisionMission
        initialVision={statsData.vision}
        initialMission={statsData.mission}
        onUpdate={handleUpdate}
      />
    </div>
  ) : null;

  if (error) {
    return (
      <InstitutionWorkspace title="Institution Dashboard" subtitle="" activeStepKey="dashboard">
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
      title="Institution Dashboard"
      subtitle=""
      activeStepKey="dashboard"
      headerContent={headerContent}
    >
      {isLoading ? (
        <div className="flex h-64 items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : (
        <div className="min-h-[600px]">
          <InstitutionDashboardHome statsData={statsData} loading={isLoading} />
        </div>
      )}
    </InstitutionWorkspace>
  );
});

export default Dashboard;
