export const INSTITUTION_TYPES = ["Private", "Government"] as const;
// export const INSTITUTION_STATUSES = ['Autonomous', 'Non-Autonomous'] as const;
export const DEGREES = ["Diploma", "B.E", "B.Tech", "M.Tech", "M.E", "MBA", "B.Sc", "M.Sc", "PhD"] as const;
export const LEVELS = ["Diploma", "UG", "PG", "Integrated"] as const;

export const PASSWORD_REGEX = /^(?=.*[A-Za-z])(?=.*\d)(?=.*[\W_]).{8,}$/;

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function validateSignupPayload(payload: {
  institutionName: string;
  email: string;
  password: string;
  confirmPassword: string;
}) {
  const institutionName = payload.institutionName.trim();
  const email = payload.email.trim();

  if (
    !institutionName ||
    !email ||
    !payload.password ||
    !payload.confirmPassword
  ) {
    return "All fields are required.";
  }

  if (institutionName.length < 3 || institutionName.length > 100) {
    return "Institution name must be between 3 and 100 characters.";
  }

  if (!EMAIL_REGEX.test(email)) {
    return "Enter a valid email address.";
  }

  if (!PASSWORD_REGEX.test(payload.password)) {
    return "Password must be at least 8 characters, include a letter, a number, and a special character.";
  }

  if (payload.password !== payload.confirmPassword) {
    return "Passwords do not match.";
  }

  return null;
}

export function validateInstitutionDetailsPayload(payload: {
  institution_type: string;
  institution_status: string;
  established_year: number;
  university_affiliation?: string | null;
  city: string;
  state: string;
}) {
  if (
    !INSTITUTION_TYPES.includes(
      payload.institution_type as (typeof INSTITUTION_TYPES)[number],
    )
  ) {
    return "Invalid institution type.";
  }

  if (!payload.institution_status?.trim()) {
    return "Institution status is required.";
  }

  const currentYear = new Date().getFullYear();
  if (
    !Number.isInteger(payload.established_year) ||
    payload.established_year < 1900 ||
    payload.established_year > currentYear
  ) {
    return `Established year must be between 1900 and ${currentYear}.`;
  }

  if (!payload.city?.trim()) {
    return "City is required.";
  }

  if (!payload.state?.trim()) {
    return "State is required.";
  }

  // Removed conditional affiliation check

  return null;
}

export function validateProgramPayload(payload: {
  program_name: string;
  degree: string;
  level: string;
  duration: number;
  intake: number;
  academic_year: string;
  program_code: string;
}) {
  if (!payload.program_name?.trim()) return "Program name is required.";
  if (!payload.program_code?.trim()) return "Program code is required.";

  if (!DEGREES.includes(payload.degree as (typeof DEGREES)[number]))
    return "Invalid degree.";
  if (!LEVELS.includes(payload.level as (typeof LEVELS)[number]))
    return "Invalid level.";

  if (
    !Number.isInteger(payload.duration) ||
    payload.duration < 1 ||
    payload.duration > 6
  ) {
    return "Duration must be between 1 and 6 years.";
  }

  if (!Number.isInteger(payload.intake) || payload.intake <= 0) {
    return "Intake must be greater than 0.";
  }

  if (!payload.academic_year?.trim()) return "Academic year is required.";

  return null;
}

export function validateVisionMissionPayload(payload: {
  vision: string;
  mission: string;
}) {
  if (!payload.vision?.trim()) return "Vision statement is required.";
  if (payload.vision.trim().length < 10)
    return "Vision statement must be at least 10 characters.";

  if (!payload.mission?.trim()) return "Mission statement is required.";
  if (payload.mission.trim().length < 10)
    return "Mission statement must be at least 10 characters.";

  return null;
}
