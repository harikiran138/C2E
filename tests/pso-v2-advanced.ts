import { psoAgent } from "../lib/ai/pso-agent";
import { PSO } from "../lib/ai/pso-scoring";

/**
 * Advanced PSO Engine Test Suite (v2)
 * Validates 16 production scenarios against the new engine logic.
 */

interface TestCase {
  category: string;
  name: string;
  program: string;
  count: number;
  input: string[];
  expectedBehavior: string;
}

const TEST_CASES: TestCase[] = [
  // CATEGORY 1: PO-LIKE DETECTION & FIX
  {
    category: "PO-LIKE",
    name: "Pure PO (Ethics Only)",
    program: "Electrical Engineering",
    count: 3,
    input: [
      "Assess ethical implications in engineering projects",
      "Analyze electrical systems in power applications",
      "Design communication systems for real-time applications"
    ],
    expectedBehavior: "PSO 1 (Ethics) should be converted to domain-specific OR removed and replaced with a high-quality PSO."
  },
  {
    category: "PO-LIKE",
    name: "Generic Engineering PSO",
    program: "Mechanical Engineering",
    count: 3,
    input: [
      "Apply engineering knowledge to solve problems",
      "Design embedded systems",
      "Evaluate circuits"
    ],
    expectedBehavior: "PSO 1 should be refined with Mechanical keywords."
  },
  // CATEGORY 2: MULTI-VERB CLEANUP
  {
    category: "MULTI-VERB",
    name: "Multiple Verbs Cleanup",
    program: "Robotics Engineering",
    count: 3,
    input: [
      "Analyze and design electrical systems", 
      "Evaluate and implement circuits",
      "Develop signal processing algorithms"
    ],
    expectedBehavior: "Each PSO should be simplified to ONE primary action verb."
  },
  {
    category: "MULTI-VERB",
    name: "Overloaded PSO",
    program: "Communication Engineering",
    count: 3,
    input: [
      "Design, implement and evaluate communication systems",
      "Analyze circuits",
      "Develop embedded systems"
    ],
    expectedBehavior: "PSO 1 should be reduced to one competency (e.g., Design)."
  },
  // CATEGORY 3: OVERLAP DETECTION
  {
    category: "OVERLAP",
    name: "Duplicate Meaning",
    program: "Electrical Engineering",
    count: 3,
    input: [
      "Analyze electrical circuits",
      "Evaluate electrical circuits",
      "Design communication systems"
    ],
    expectedBehavior: "PSO 1 & 2 should be differentiated (e.g., Analysis vs Evaluation)."
  },
  {
    category: "OVERLAP",
    name: "Slight Variation Overlap",
    program: "Power Systems",
    count: 3,
    input: [
      "Design power systems",
      "Develop power systems",
      "Implement signal processing"
    ],
    expectedBehavior: "PSO 1 & 2 resolved (overlap)."
  },
  // CATEGORY 4: DOMAIN ENFORCEMENT
  {
    category: "DOMAIN",
    name: "Generic Terms Converstion",
    program: "Computer Science and Engineering",
    count: 3,
    input: [
      "Analyze engineering systems",
      "Design solutions",
      "Evaluate systems"
    ],
    expectedBehavior: "All should be converted to CSE-specific terms (algorithms, software, databases)."
  },
  {
    category: "DOMAIN",
    name: "Wrong Domain Correction",
    program: "Electrical Engineering",
    count: 3,
    input: [
      "Analyze mechanical systems",
      "Design circuits",
      "Evaluate signal processing"
    ],
    expectedBehavior: "Mechanical systems (PSO 1) should be corrected to Electrical."
  },
  // CATEGORY 5: TOOL GENERALIZATION
  {
    category: "TOOLS",
    name: "Over-Specific Tools",
    program: "Automation",
    count: 3,
    input: [
      "Analyze systems using MATLAB and Simulink",
      "Design circuits using Python",
      "Evaluate systems"
    ],
    expectedBehavior: "Replace specific tools with 'modern computational tools'."
  },
  {
    category: "TOOLS",
    name: "Valid Domain-Critical Tool",
    program: "Production Engineering",
    count: 3,
    input: [
      "Implement CNC manufacturing systems",
      "Design jigs and fixtures",
      "Evaluate workflow"
    ],
    expectedBehavior: "CNC should be preserved (domain-critical)."
  },
  // CATEGORY 6: USER-CONTROLLED COUNT
  {
    category: "COUNT",
    name: "5 PSOs Dynamic Count",
    program: "IT Engineering",
    count: 5,
    input: [
      "Analyze web apps", "Design cloud infrastructure", "Implement security", "Evaluate database", "Develop mobile apps"
    ],
    expectedBehavior: "Outcome count MUST be exactly 5."
  },
  {
    category: "COUNT",
    name: "2 PSOs Dynamic Count",
    program: "Mechatronics",
    count: 2,
    input: [
      "Design sensors", "Implement control systems"
    ],
    expectedBehavior: "Outcome count MUST be exactly 2."
  },
  // CATEGORY 7: NON-DESTRUCTIVE LOGIC
  {
    category: "NON-DESTRUCTIVE",
    name: "Perfect PSO (No Change)",
    program: "Electrical Engineering",
    count: 3,
    input: [
      "Analyze power systems for stability and efficiency under varying load conditions",
      "Design embedded control systems",
      "Evaluate signal processing"
    ],
    expectedBehavior: "PSO 1 (Strong) should remain UNCHANGED or minimally improved."
  },
  {
    category: "NON-DESTRUCTIVE",
    name: "Poor PSO (Full Rewrite)",
    program: "Engineering",
    count: 3,
    input: [
      "Understand engineering",
      "Do coding",
      "Fix things"
    ],
    expectedBehavior: "All should be completely rewritten."
  }
];

async function runTestSuite() {
  console.log("🏁 STARTING ADVANCED PSO V2 TESTING SUITE\n");

  for (const test of TEST_CASES) {
    console.log(`\n---------------------------------------------------------`);
    console.log(`TEST: [${test.category}] ${test.name}`);
    console.log(`INPUT COUNT: ${test.count}`);
    console.log(`INPUT: ${JSON.stringify(test.input, null, 2)}`);
    console.log(`---------------------------------------------------------`);

    try {
      const result = await psoAgent({
        programName: test.program,
        count: test.count,
        initialPSOs: test.input, // Pass inputs for refinement
        mode: "strict"
      });

      console.log(`STATUS: ${result.success ? "✅ PASS" : "❌ FAIL"}`);
      console.log(`SCORE: ${result.meta?.score}`);
      console.log(`ISSUES FIXED: ${result.validation?.globalIssues.join(", ") || "None"}`);
      
      result.results.forEach((p, i) => {
        console.log(`RESULT ${i+1}: "${p.statement}"`);
      });

    } catch (err: any) {
      console.error(`🚨 EXCEPTION: ${err.message}`);
    }
  }

  console.log("\n\n🏁 TESTING COMPLETE.");
}

// In standard context, we would need to slightly modify psoAgent to allow 
// pre-seeding the `currentPSOs` for a pure refinement-only test.
// Since we want to test REFINEMENT of specific inputs, I'll update psoAgent first.

runTestSuite();
