import type { ProgramAcademicContext } from "@/lib/curriculum/program-context";

export interface OBEValidationOptions {
  minPeos?: number;
  minPos?: number;
}

export interface OBEValidationResult {
  blocked: boolean;
  errors: string[];
  warnings: string[];
}

const DEFAULT_MIN_PEOS = 3;
const DEFAULT_MIN_POS = 12;

function asInt(value: unknown, fallback: number): number {
  const parsed = Math.floor(Number(value));
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : fallback;
}

export class OBEValidator {
  private readonly context: ProgramAcademicContext;
  private readonly minPeos: number;
  private readonly minPos: number;

  constructor(context: ProgramAcademicContext, options?: OBEValidationOptions) {
    this.context = context;
    this.minPeos = asInt(options?.minPeos, DEFAULT_MIN_PEOS);
    this.minPos = asInt(options?.minPos, DEFAULT_MIN_POS);
  }

  validate(): OBEValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    if (!this.context.mission) {
      errors.push(
        "Curriculum generation blocked: Mission statements are missing. Generate and activate mission statements first.",
      );
    }

    if (this.context.peoCount === null) {
      warnings.push("PEO count could not be verified because program_peos is unavailable.");
    } else if (this.context.peoCount < this.minPeos) {
      errors.push(
        `Curriculum generation blocked: Program has ${this.context.peoCount} PEOs. At least ${this.minPeos} PEOs required.`,
      );
    }

    if (this.context.poCount === null) {
      warnings.push("PO count could not be verified because program_outcomes is unavailable.");
    } else if (this.context.poCount < this.minPos) {
      errors.push(
        `Curriculum generation blocked: Program has ${this.context.poCount} POs. At least ${this.minPos} POs required.`,
      );
    }

    if (!this.context.hasPeoPoMatrix) {
      errors.push(
        "Curriculum generation blocked: PEO-PO Matrix is missing. Configure the PEO-PO Matrix first.",
      );
    }

    if (!this.context.hasConsistencyMatrix) {
      errors.push(
        "Curriculum generation blocked: Consistency Matrix is missing. Configure the consistency matrix first.",
      );
    }

    return {
      blocked: errors.length > 0,
      errors,
      warnings,
    };
  }
}
