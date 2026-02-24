'use client';

import { useMemo } from 'react';
import { useParams, useSearchParams } from 'next/navigation';

type RouteParams = {
  programId?: string;
  program_id?: string;
};

/**
 * Resolves program context from route params first and query params as fallback.
 */
export function useActiveProgramId() {
  const params = useParams<RouteParams>();
  const searchParams = useSearchParams();

  return useMemo(() => {
    if (typeof params?.programId === 'string' && params.programId.trim().length > 0) {
      return params.programId;
    }

    if (typeof params?.program_id === 'string' && params.program_id.trim().length > 0) {
      return params.program_id;
    }

    return searchParams.get('programId') || '';
  }, [params?.programId, params?.program_id, searchParams]);
}
