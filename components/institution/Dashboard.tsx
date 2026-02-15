'use client';

import { useEffect, useState } from 'react';
import InstitutionWorkspace from '@/components/institution/workspace/InstitutionWorkspace';
import Stats from '@/components/institution/dashboard/Stats';
import RecentActivity from '@/components/institution/dashboard/RecentActivity';
import PerformanceChart from '@/components/institution/dashboard/PerformanceChart';
import { Loader2 } from 'lucide-react';

export default function Dashboard() {
  const [loading, setLoading] = useState(true);
  const [statsData, setStatsData] = useState<any>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await fetch('/api/institution/dashboard');
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
  }, []);

  return (
    <InstitutionWorkspace
      title="Dashboard"
      subtitle="Overview of your institution's performance and curriculum status."
    >
      <div className="space-y-8">
        {loading ? (
             <div className="flex h-64 items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
             </div>
        ) : (
            <>
                <Stats data={statsData} />

                <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
                  <PerformanceChart />
                  <RecentActivity />
                </div>
            </>
        )}
      </div>
    </InstitutionWorkspace>
  );
}
