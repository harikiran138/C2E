import { buildCurriculum } from "@/lib/curriculum/engine";
import { CurriculumValidator } from "@/lib/curriculum/validator";
import { CurriculumRepairEngine } from "@/lib/curriculum/repair-engine";

function assert(condition: boolean, message: string): void {
  if (!condition) {
    throw new Error(message);
  }
}

async function main(): Promise<void> {
  const built = buildCurriculum({
    programName: "B.Tech Computer Science and Engineering",
    totalCredits: 160,
    mode: "AICTE_MODEL",
  });

  assert(!!built.curriculum, `Initial build failed: ${(built.errors || []).join("; ")}`);

  const repaired = CurriculumRepairEngine.repair(built.curriculum!);
  const validation = new CurriculumValidator(repaired.curriculum).validate();

  assert(
    validation.passed,
    `Repaired curriculum still invalid: ${validation.errors.join(" | ")}`,
  );

  console.log(
    "Curriculum repair smoke test passed:",
    JSON.stringify(
      {
        totalCredits: repaired.curriculum.totalCredits,
        errors: validation.errors.length,
        warnings: validation.warnings.length,
        actions: repaired.actions.length,
      },
      null,
      2,
    ),
  );
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
