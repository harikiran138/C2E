export interface COAttainmentInput {
  internalScore: number;
  externalScore: number;
}

export function calculateCOAttainment(input: COAttainmentInput): number {
  const internal = Number.isFinite(input.internalScore) ? Number(input.internalScore) : 0;
  const external = Number.isFinite(input.externalScore) ? Number(input.externalScore) : 0;
  const value = internal * 0.3 + external * 0.7;
  return Math.round(value * 100) / 100;
}

export function calculatePOAttainment(entries: Array<{ coAttainment: number; strength: number }>): number {
  if (!Array.isArray(entries) || entries.length === 0) return 0;
  const weighted = entries.reduce((sum, entry) => {
    const attainment = Number.isFinite(entry.coAttainment) ? entry.coAttainment : 0;
    const strength = Number.isFinite(entry.strength) ? entry.strength : 0;
    const mappingStrength = Math.min(3, Math.max(1, Math.round(strength)));
    return sum + attainment * mappingStrength;
  }, 0);

  return Math.round(weighted * 100) / 100;
}

export function normalizeAcademicYear(value: unknown): string {
  const normalized = String(value || "").trim();
  if (normalized) return normalized;
  const date = new Date();
  const startYear = date.getUTCMonth() >= 6 ? date.getUTCFullYear() : date.getUTCFullYear() - 1;
  const endYear = startYear + 1;
  return `${startYear}-${String(endYear).slice(-2)}`;
}
