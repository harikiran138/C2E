function normalizeSegment(value: string, fallback: string) {
  const normalized = value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9-]+/g, "")
    .replace(/^-+|-+$/g, "");

  return normalized || fallback;
}

export function normalizeProgramCode(programCode: string) {
  return normalizeSegment(programCode, "program");
}

export function normalizeInstitutionShortform(
  shortform?: string | null,
  institutionName?: string | null,
) {
  const cleanedShortform = normalizeSegment(shortform || "", "");
  if (cleanedShortform) {
    return cleanedShortform;
  }

  const initials =
    institutionName
      ?.match(/[A-Za-z0-9]+/g)
      ?.map((part) => part[0]?.toLowerCase() || "")
      .join("") || "";

  if (initials.length >= 2) {
    return normalizeSegment(initials.slice(0, 12), "inst");
  }

  return normalizeSegment((institutionName || "").slice(0, 12), "inst");
}

export function buildProgramLoginEmail(
  programCode: string,
  institutionShortform?: string | null,
  institutionName?: string | null,
) {
  const normalizedCode = normalizeProgramCode(programCode);
  const normalizedInstitution = normalizeInstitutionShortform(
    institutionShortform,
    institutionName,
  );

  return `${normalizedCode}@${normalizedInstitution}.c2x.ai`;
}
