import dotenv from "dotenv";
import path from "path";
import { psoAgent } from "../lib/ai/pso-agent";

dotenv.config({ path: path.join(process.cwd(), ".env.local") });

async function verify() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    console.error("GEMINI_API_KEY missing in .env.local");
    return;
  }

  console.log("Verifying PSO Agent with Gemini API...");
  try {
    const result = await psoAgent({
      programName: "Computer Science and Engineering",
      count: 3,
      selectedSocieties: { lead: ["ACM", "IEEE-CS"] },
      geminiApiKey: apiKey,
    });

    console.log("Results generated:", result.results.length);
    console.log("Result 1:", result.results[0]);
    console.log("Is fallback:", !!result.results[0].includes("Use key concepts")); // My template fallback uses this phrase.
    
    if (!result.results[0].includes("Use key concepts")) {
      console.log("✅ SUCCESS: Gemini generated dynamic content!");
    } else {
      console.log("❌ FAILURE: Fell back to template logic.");
    }
  } catch (error) {
    console.error("Verification failed:", error);
  }
}

verify();
