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

  const fetchData = useCallback(async () => {
    try {
      const res = await fetch('/api/institution/me');
      if (res.ok) {
        const data = await res.json();
        setInstitution(data.institution);
        setPrograms(data.programs);
        setAuthenticated(data.authenticated);

        // Handle program selection from URL or default to first ONLY if strictly needed
        const urlProgramId = searchParams.get('programId');
        if (urlProgramId) {
          const found = data.programs.find((p: Program) => p.id === urlProgramId);
          setSelectedProgram(found || null);
        } else {
          // No program in URL
          if (pathname.includes('/process/')) {
             // If on a process page, we MUST have a program. Default to first.
             if (data.programs.length > 0) {
                 setSelectedProgram(data.programs[0]);
                 const params = new URLSearchParams(searchParams.toString());
                 params.set('programId', data.programs[0].id);
                 router.replace(`${pathname}?${params.toString()}`);
             }
          } else {
             // On Dashboard or other pages, allow "No Program" state (Institution View)
             setSelectedProgram(null);
          }
        }
      } else if (res.status === 401) {
        setAuthenticated(false);
        if (pathname.startsWith('/institution') && !pathname.includes('/login') && !pathname.includes('/signup')) {
            router.push('/institution/login');
        }
      }
    } catch (err) {
      console.error('Failed to fetch institution context:', err);
    } finally {
      setLoading(false);
    }
  }, [pathname, searchParams, router]);

  useEffect(() => {
    if (pathname.startsWith('/institution') && !pathname.includes('/login') && !pathname.includes('/signup')) {
      fetchData();
    } else {
      setLoading(false);
    }
  }, [pathname, fetchData]);

  // Sync selectedProgram with URL param reactively
  useEffect(() => {
    const urlProgramId = searchParams.get('programId');
    if (urlProgramId && programs.length > 0) {
      if (selectedProgram?.id !== urlProgramId) {
        const found = programs.find(p => p.id === urlProgramId);
        if (found) setSelectedProgram(found);
      }
    } else if (!urlProgramId && selectedProgram) {
      // URL has no programId, but we have a selectedProgram.
      // If we are on dashboard, this means we want to go up to Institution View.
      // If we are on process, we usually redirect in fetchData, but for client-side nav:
      if (!pathname.includes('/process/')) {
          setSelectedProgram(null);
      }
    }
  }, [searchParams, programs, selectedProgram, pathname]);

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
