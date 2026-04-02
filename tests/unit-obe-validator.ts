import { CurriculumValidator } from "../lib/curriculum/validator";
import { GeneratedCurriculum } from "../lib/curriculum/engine";

function assert(condition: boolean, message: string) {
  if (!condition) {
    throw new Error(`Assertion failed: ${message}`);
  }
}

const MOCK_CURRICULUM: GeneratedCurriculum = {
  programName: "CSE TEST",
  totalCredits: 160,
  semesterCount: 8,
  mode: "AICTE_MODEL",
  generatedAt: new Date().toISOString(),
  categorySummary: [],
  semesters: [
    {
      semester: 1,
      level: "Foundation",
      totalCredits: 20,
      categoryCourseCounts: { BS: 2, ES: 1, HSS: 1, PC: 0, PE: 0, OE: 0, MC: 0, AE: 1, SE: 1, PR: 0 },
      courses: [
        { semester: 1, category: "BS", courseCode: "BS101", courseTitle: "Math I", credits: 4, tHours: 4, tuHours: 0, llHours: 0, twHours: 0, totalHours: 4 },
        { semester: 1, category: "ES", courseCode: "ES101", courseTitle: "Prog I", credits: 4, tHours: 4, tuHours: 0, llHours: 0, twHours: 0, totalHours: 4 },
      ]
    },
    // Skipping other semesters for brevity in mock, 
    // but the validator should handle it.
  ]
};

async function testCreditValidation() {
  console.log("🧪 Testing Credit Validation...");
  
  const invalidMock = JSON.parse(JSON.stringify(MOCK_CURRICULUM));
  invalidMock.totalCredits = 150; // Not 160
  
  const v1 = new CurriculumValidator(invalidMock, true);
  const errors = v1.validateCredits();
  
  // 1. Mismatch check (150 declared vs 8 actual in mock)
  assert(errors.some(e => e.includes("mismatch")), "Failed to detect credit mismatch");
  
  // 2. Target check (150 vs 160)
  assert(errors.some(e => e.includes("Current value is 150")), "Failed to detect target total mismatch");
  console.log("✅ Credit Validation tests passed!");
}

async function testStructuralRules() {
  console.log("🧪 Testing Structural Rules (NEP/AICTE)...");
  
  const v = new CurriculumValidator(MOCK_CURRICULUM, true);
  
  // 1. Foundation Check (Sem 1 has BS/ES)
  const nep = v.validateNEPStructure();
  // In our mock, Sem 1 has BS/ES, so it should NOT have foundation violation for sem 1.
  assert(!nep.some(e => e.includes("semester 1 must include")), "False positive foundation violation");

  // 2. PR violation (PR shouldn't be in sem < 4)
  const mockWithEarlyPR = JSON.parse(JSON.stringify(MOCK_CURRICULUM));
  mockWithEarlyPR.semesters[0].courses.push({
    semester: 1, category: "PR", courseCode: "PR101", courseTitle: "Project I", credits: 4
  });
  const v2 = new CurriculumValidator(mockWithEarlyPR, true);
  const prErrors = v2.validateNEPStructure();
  assert(prErrors.some(e => e.includes("semester 1; allowed from semester 4")), "Failed to detect early PR");

  console.log("✅ Structural Rules tests passed!");
}

async function testConsistency() {
    console.log("🧪 Testing Course Uniqueness...");
    const mockDup = JSON.parse(JSON.stringify(MOCK_CURRICULUM));
    mockDup.semesters[0].courses.push(
        { semester: 1, category: "BS", courseCode: "BS102", courseTitle: "Math-1", credits: 4 }
    );
    // Math I vs Math-1 should be duplicates after normalization which replaces symbols with spaces.
    const v = new CurriculumValidator(mockDup, true);
    const unique = v.validateCourseUniqueness();
    assert(unique.length > 0, "Duplicate titles NOT detected");
    console.log("✅ Course Uniqueness tests passed!");
}

async function runAll() {
  console.log("\n--- STARTING OBE VALIDATOR UNIT TESTS ---");
  try {
    await testCreditValidation();
    await testStructuralRules();
    await testConsistency();
    console.log("--- ALL OBE VALIDATOR UNIT TESTS PASSED ---");
  } catch (err: any) {
    console.error("❌ TEST FAILED:", err.message);
    process.exit(1);
  }
}

runAll();
