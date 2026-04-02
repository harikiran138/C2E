import { 
  normalizeCourseTitle, 
  buildFallbackTitle,
  buildCurriculum 
} from "../lib/curriculum/engine";

function assert(condition: boolean, message: string) {
  if (!condition) {
    throw new Error(`Assertion failed: ${message}`);
  }
}

async function testNormalization() {
  console.log("🧪 Testing normalizeCourseTitle...");
  assert(normalizeCourseTitle("Math-I") === "math i", "Simple hyphen failed");
  assert(normalizeCourseTitle("  Data   Science  ") === "data science", "Whitespace failed");
  assert(normalizeCourseTitle("AI & Machine Learning!") === "ai machine learning", "Symbols failed");
  console.log("✅ normalizeCourseTitle passed!");
}

async function testDepartmentDetection() {
  console.log("🧪 Testing detectProgramTrack (internal)...");
  // We can't access private functions easily if they aren't exported, 
  // but we can test buildCurriculum which uses it.
}

async function testTitleGeneration() {
  console.log("🧪 Testing buildFallbackTitle...");
  const used = new Set<string>();
  
  const t1 = buildFallbackTitle({
    programName: "Computer Science",
    category: "BS",
    semester: 1,
    usedTitles: used
  });
  console.log(`   Sample BS Title: ${t1}`);
  assert(used.has(normalizeCourseTitle(t1)), "Title not added to used set");

  const t2 = buildFallbackTitle({
    programName: "Computer Science",
    category: "BS",
    semester: 1,
    usedTitles: used
  });
  console.log(`   Sample Duplicate BS Title: ${t2}`);
  assert(t1 !== t2, "Duplicate title generated");
  console.log("✅ buildFallbackTitle passed!");
}

async function testCurriculumBuild() {
  console.log("🧪 Testing buildCurriculum...");
  
  const result = buildCurriculum({
    programName: "B.Tech AI & Data Science",
    totalCredits: 160,
    semesterCount: 8,
    mode: "AICTE_MODEL"
  });

  assert(result.curriculum !== null, "Curriculum build failed");
  if (result.curriculum) {
    assert(result.curriculum.totalCredits === 160, `Credit mismatch: ${result.curriculum.totalCredits}`);
    assert(result.curriculum.semesters.length === 8, `Semester count mismatch: ${result.curriculum.semesters.length}`);
    
    // Check specific category presence (BS should be in early semesters)
    const sem1 = result.curriculum.semesters[0];
    const hasBS = sem1.courses.some(c => c.category === "BS");
    assert(hasBS, "Semester 1 missing BS courses");
    
    console.log(`   Build Summary: ${result.curriculum.categorySummary.length} categories found.`);
  }
  
  console.log("✅ buildCurriculum passed!");
}

async function runAll() {
  console.log("--- STARTING CORE LOGIC UNIT TESTS ---");
  try {
    await testNormalization();
    await testTitleGeneration();
    await testCurriculumBuild();
    console.log("--- ALL CORE LOGIC UNIT TESTS PASSED ---");
  } catch (err: any) {
    console.error("❌ TEST FAILED:", err.message);
    process.exit(1);
  }
}

runAll();
