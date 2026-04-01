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
  shortform?: string;
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
  const fetchData = useCallback(async () => {
    try {
      const res = await fetch('/api/auth/me');
      if (res.ok) {
        const data = await res.json();
        setInstitution(data.institution);
        setPrograms(data.programs || []);
        setAuthenticated(true);
        // Persist role in state if needed or from cookies
      } else if (res.status === 401) {
        setAuthenticated(false);
        if (pathname.startsWith('/institution') && !pathname.includes('/login')) {
            router.push('/institution/login');
        }
      }
    } catch (err) {
      console.error('Failed to fetch auth context:', err);
    } finally {
      setLoading(false);
    }
  }, [pathname, router]);

  // Initial fetch
  useEffect(() => {
    if (pathname.startsWith('/institution') && !pathname.includes('/login')) {
        fetchData();
    } else {
        setLoading(false);
    }
  }, [fetchData, pathname]);

  // Sync selectedProgram with URL param reactively
  useEffect(() => {
    if (loading || !authenticated) return;

    const urlProgramId = searchParams.get('programId');
    if (urlProgramId) {
      if (selectedProgram?.id !== urlProgramId) {
        const found = programs.find(p => p.id === urlProgramId);
        if (found) {
            setSelectedProgram(found);
        }
      }
    } 
    // If PROGRAM_ADMIN and only 1 program, auto-lock it if no param
    else if (programs.length === 1 && !urlProgramId && !pathname.includes('/login')) {
        const onlyProg = programs[0];
        setSelectedProgram(onlyProg);
        const params = new URLSearchParams(searchParams.toString());
        params.set('programId', onlyProg.id);
        router.replace(`${pathname}?${params.toString()}`);
    }
    else if (pathname.includes('/process/') && programs.length > 0) {
        const first = programs[0];
        setSelectedProgram(first);
        const params = new URLSearchParams(searchParams.toString());
        params.set('programId', first.id);
        router.replace(`${pathname}?${params.toString()}`);
    }
    else if (!urlProgramId && selectedProgram) {
         setSelectedProgram(null);
    }
  }, [searchParams, programs, selectedProgram, pathname, loading, router, authenticated]);

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
