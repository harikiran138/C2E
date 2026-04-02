"use client";

import { useEffect, useCallback, useMemo, memo } from "react";
import useSWR from "swr";
import InstitutionWorkspace from "@/components/institution/workspace/InstitutionWorkspace";
import { Loader2 } from "lucide-react";
import ProgramDashboardHome from "@/components/institution/dashboard/ProgramDashboardHome";
import { useInstitution } from "@/context/InstitutionContext";

const fetcher = async (url: string) => {
  const res = await fetch(url);
  if (!res.ok) {
    const error = new Error("An error occurred while fetching the data.");
    const info = await res.json();
    (error as any).info = info;
    (error as any).status = res.status;
    throw error;
  }
  return res.json();
};

const ProgramDashboard = memo(function ProgramDashboard() {
  const { selectedProgram, refreshData } = useInstitution();

  const apiUrl = useMemo(() => {
    return selectedProgram?.id
      ? `/api/institution/dashboard?programId=${selectedProgram.id}`
      : null;
  }, [selectedProgram?.id]);

  const {
    data: statsData,
    error,
    isLoading,
    mutate,
  } = useSWR(apiUrl, fetcher, {
    revalidateOnFocus: false,
    dedupingInterval: 10000,
  });

  useEffect(() => {
    refreshData();
  }, [refreshData]);

  const pageTitle = selectedProgram?.program_name || "Program Dashboard";
  const pageSubtitle = "Manage curriculum, assessments, and outcomes.";

  if (error) {
    return (
      <InstitutionWorkspace
        title={pageTitle}
        subtitle={pageSubtitle}
        activeStepKey="dashboard"
      >
        <div className="flex h-64 flex-col items-center justify-center space-y-4">
          <div className="text-center">
            <p className="text-red-500 font-medium">
              Failed to load dashboard data.
            </p>
            {error.info && (
              <p className="text-sm text-muted-foreground mt-1">
                {error.info.message || error.info.error}
              </p>
            )}
          </div>
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
    >
      {!selectedProgram || isLoading ? (
        <div className="flex h-64 items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : (
        <div className="min-h-[600px]">
          <ProgramDashboardHome
            statsData={statsData}
            loading={isLoading}
            programName={selectedProgram.program_name}
            selectedProgramId={selectedProgram.id}
          />
        </div>
      )}
    </InstitutionWorkspace>
  );
});

export default ProgramDashboard;
