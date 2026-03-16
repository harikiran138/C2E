'use client';

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';

interface Institution {
  id: string;
  institution_name: string;
  email: string;
  institution_type: string;
  institution_status: string;
  onboarding_status: string;
  city: string;
  state: string;
  vision?: string;
  mission?: string;
}

interface Program {
  id: string;
  program_name: string;
  program_code: string;
  degree: string;
  intake: number;
  duration: number;
}

interface InstitutionContextType {
  institution: Institution | null;
  programs: Program[];
  selectedProgram: Program | null;
  loading: boolean;
  authenticated: boolean;
  refreshData: () => Promise<void>;
  selectProgram: (programId: string) => void;
}

const InstitutionContext = createContext<InstitutionContextType | undefined>(undefined);

export function InstitutionProvider({ children }: { children: React.ReactNode }) {
  const [institution, setInstitution] = useState<Institution | null>(null);
  const [programs, setPrograms] = useState<Program[]>([]);
  const [selectedProgram, setSelectedProgram] = useState<Program | null>(null);
  const [loading, setLoading] = useState(true);
  const [authenticated, setAuthenticated] = useState(false);
  
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  /* 
     Refactored to separate data fetching from URL parameter syncing.
     fetchData now only fetches if we don't have data or explicitly requested.
  */
  const fetchData = useCallback(async (force = false) => {
    // We used to skip fetching here if data existed, but that caused stale sidebar issues.
    // Now we always attempt to fetch to keep the context in sync with the DB.

    try {
      const res = await fetch('/api/institution/me');
      if (res.ok) {
        const data = await res.json();
        setInstitution(data.institution);
        setPrograms(data.programs);
        setAuthenticated(data.authenticated);
      } else if (res.status === 401) {
        setAuthenticated(false);
        // Only redirect if valid path
        if (pathname.startsWith('/institution') && !pathname.includes('/login') && !pathname.includes('/signup')) {
            router.push('/institution/login');
        }
      }
    } catch (err) {
      console.error('Failed to fetch institution context:', err);
    } finally {
      setLoading(false);
    }
  }, [pathname, router]);

  // Initial fetch
  useEffect(() => {
    if (pathname.startsWith('/institution') && !pathname.includes('/login') && !pathname.includes('/signup')) {
        // Pass false to avoid refetching if we already have data (handled inside fetchData)
        // But actually, we want to ensure we fetch at least once.
        // The check inside fetchData handles it.
        fetchData();
    } else {
        setLoading(false);
    }
  }, [fetchData, pathname]);

  // Sync selectedProgram with URL param reactively - SEPARATED from fetching
  useEffect(() => {
    if (loading) return; // Wait for data

    const urlProgramId = searchParams.get('programId');
    
    // 1. If URL has programId, try to select it
    if (urlProgramId) {
      if (selectedProgram?.id !== urlProgramId) {
        const found = programs.find(p => p.id === urlProgramId);
        if (found) {
            setSelectedProgram(found);
        }
      }
    } 
    // 2. If no URL param, but we are in a /process/ route, we MUST have a program.
    else if (pathname.includes('/process/')) {
        if (programs.length > 0) {
            // Default to first program
            const first = programs[0];
            setSelectedProgram(first);
            // Update URL
            const params = new URLSearchParams(searchParams.toString());
            params.set('programId', first.id);
            router.replace(`${pathname}?${params.toString()}`);
        }
    }
    // 3. If no URL param and NOT in process (e.g. Dashboard), allow null (Institution View)
    else if (!urlProgramId && selectedProgram) {
         setSelectedProgram(null);
    }
  }, [searchParams, programs, selectedProgram, pathname, loading, router]);

  const selectProgram = useCallback((programId: string) => {
    const found = programs.find(p => p.id === programId);
    if (found) {
      setSelectedProgram(found);
      const params = new URLSearchParams(searchParams.toString());
      params.set('programId', programId);
      router.push(`${pathname}?${params.toString()}`);
    }
  }, [programs, pathname, searchParams, router]);

  return (
    <InstitutionContext.Provider value={{ 
        institution, 
        programs, 
        selectedProgram, 
        loading, 
        authenticated,
        refreshData: fetchData,
        selectProgram
    }}>
      {children}
    </InstitutionContext.Provider>
  );
}

export function useInstitution() {
  const context = useContext(InstitutionContext);
  if (context === undefined) {
    throw new Error('useInstitution must be used within an InstitutionProvider');
  }
  return context;
}
