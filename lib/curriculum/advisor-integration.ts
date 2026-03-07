export interface CurriculumAdvisorSnapshot {
  programId: string;
  totalCredits: number;
  semesterCount: number;
  categoryDistribution: Record<string, number>;
  recommendedElectives: string[];
  modernSubjects: Record<string, string[]>;
  advisorNotes: string;
  createdAt: string;
}

const STORAGE_PREFIX = "curriculum-advisor::";

export function buildCurriculumAdvisorStorageKey(programId: string): string {
  return `${STORAGE_PREFIX}${String(programId || "").trim()}`;
}

export function saveCurriculumAdvisorSnapshot(snapshot: CurriculumAdvisorSnapshot): void {
  if (typeof window === "undefined") return;
  const key = buildCurriculumAdvisorStorageKey(snapshot.programId);
  window.localStorage.setItem(key, JSON.stringify(snapshot));
}

export function readCurriculumAdvisorSnapshot(
  programId: string,
): CurriculumAdvisorSnapshot | null {
  if (typeof window === "undefined") return null;
  const key = buildCurriculumAdvisorStorageKey(programId);
  const raw = window.localStorage.getItem(key);
  if (!raw) return null;

  try {
    const parsed = JSON.parse(raw) as CurriculumAdvisorSnapshot;
    if (!parsed || typeof parsed !== "object") return null;
    if (String(parsed.programId || "") !== String(programId || "")) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function clearCurriculumAdvisorSnapshot(programId: string): void {
  if (typeof window === "undefined") return;
  const key = buildCurriculumAdvisorStorageKey(programId);
  window.localStorage.removeItem(key);
}
