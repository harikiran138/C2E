import { NextResponse } from "next/server";
import { buildCurriculumAIGuardrailsPrompt } from "@/lib/curriculum/ai-guardrails";

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const API_URL =
  "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent";

const BLOOMS_TAXONOMY = {
  remember: { verbs: ["define", "identify", "describe", "recognize", "tell", "explain", "recite", "memorize", "illustrate", "quote"], score: 10 },
  understand: { verbs: ["summarize", "interpret", "classify", "compare", "contrast", "infer", "relate", "extract", "paraphrase", "cite"], score: 20 },
  apply: { verbs: ["apply", "execute", "implement", "calculate", "solve", "use", "demonstrate", "compute", "modify", "operate", "discover"], score: 50 },
  analyze: { verbs: ["analyze", "differentiate", "organize", "attribute", "deconstruct", "outline", "integrate", "structure", "troubleshoot", "diagnose"], score: 70 },
  evaluate: { verbs: ["evaluate", "check", "critique", "judge", "test", "assess", "defend", "value", "justify", "monitor", "optimize"], score: 85 },
  create: { verbs: ["design", "construct", "plan", "produce", "invent", "devise", "formulate", "propose", "generate", "develop", "architect", "engineer"], score: 100 }
};

function normalizeWhitespace(text: string) {
  return text.replace(/\s+/g, " ").trim();
}

function evaluateBloomsLevel(statement: string) {
  const words = statement.toLowerCase().replace(/[^a-z0-9\s]/g, "").split(/\s+/);
  let highestScore = 0;
  let highestLevel = "Unknown";

  // We check the first 3 words to see if they are the primary action verb
  const openingWords = words.slice(0, 3);

  for (const [level, data] of Object.entries(BLOOMS_TAXONOMY)) {
    for (const verb of data.verbs) {
      if (openingWords.includes(verb)) {
        if (data.score > highestScore) {
          highestScore = data.score;
          highestLevel = level;
        }
      }
    }
  }

  // If we missed the verb at the start, check the whole sentence for fallback
  if (highestScore === 0) {
    for (const [level, data] of Object.entries(BLOOMS_TAXONOMY)) {
      for (const verb of data.verbs) {
        if (words.includes(verb) && data.score > highestScore) {
          highestScore = data.score * 0.8; // Penalty for not starting with the verb
          highestLevel = level;
        }
      }
    }
  }

  return { level: highestLevel, score: highestScore };
}

function enforcePsoQuality(statement: string) {
  let clean = normalizeWhitespace(statement);
  clean = clean.replace(/^(PSO\d*[:.-]?\s*)/i, "");
  clean = clean.replace(/^(students will be able to|graduates will be able to|student will be able to)\s*/i, "");
  clean = clean.replace(/^(to\s+)/i, "");

  if (clean.length > 0) {
    // Capitalize first letter
    clean = clean.charAt(0).toUpperCase() + clean.slice(1);
  }

  // Ensure ends with period
  return clean.replace(/[.?!]+$/, "") + ".";
}

function scorePsoStatement(statement: string) {
  const blooms = evaluateBloomsLevel(statement);
  const words = statement.split(/\s+/).length;

  let score = blooms.score;
  const failures: string[] = [];

  // PSOs should be complex sentences, usually 15-35 words
  if (words < 10) {
    score -= 20;
    failures.push("Too brief");
  } else if (words > 40) {
    score -= 20;
    failures.push("Too long");
  }

  if (blooms.score < 50) {
    failures.push(`Low cognitive level (${blooms.level})`);
    score -= 30; // Heavily penalize 'Remember' and 'Understand'
  }

  return {
    score: Math.max(0, Math.min(100, score)),
    bloomsLevel: blooms.level,
    failures
  };
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    console.log("PSO Request Body:", JSON.stringify(body));
    const { selected_societies, number_of_psos, program_name } = body;

    // Validate inputs
    if (
      !selected_societies ||
      (!selected_societies.lead?.length &&
        !selected_societies.co_lead?.length &&
        !selected_societies.cooperating?.length)
    ) {
      return NextResponse.json(
        { error: "At least one society must be selected." },
        { status: 400 },
      );
    }

    if (!number_of_psos || number_of_psos < 1 || number_of_psos > 20) {
      return NextResponse.json(
        { error: "Invalid number of PSOs (1-20)." },
        { status: 400 },
      );
    }

    // Fallback/Safety Check
    if (!GEMINI_API_KEY) {
      if (process.env.NODE_ENV === "production") {
        throw new Error(
          "CRITICAL SECURITY ERROR: GEMINI_API_KEY environment variable is missing.",
        );
      }
      console.warn("GEMINI_API_KEY is missing. Using mock generation.");
      const mockResults = Array.from({ length: number_of_psos }).map((_, i) => {
        return `PSO${i + 1}: Graduates will be able to apply principles of ${program_name} tailored to the standards of ${selected_societies.lead?.[0] || "Engineering Societies"}.`;
      });
      return NextResponse.json({ results: mockResults });
    }

    const guardrails = buildCurriculumAIGuardrailsPrompt(program_name);

    // Call Gemini API via Fetch
    // Constructing a detailed prompt based on the specific requirements
    const prompt = `
      You are an expert academic curriculum designer.
      Program Name: "${program_name}".
      
      Selected Professional Societies:
      - Lead Societies: ${selected_societies.lead?.join(", ") || "None"}
      - Co-Lead Societies: ${selected_societies.co_lead?.join(", ") || "None"}
      - Cooperating Societies: ${selected_societies.cooperating?.join(", ") || "None"}
      
      Task: Generate ${number_of_psos} Program Specific Outcomes (PSOs) aligned with the selected professional societies.

      PSO Framing to follow:
      - PSOs are statements that describe what students are expected to know and be able to do by the time of graduation.
      - They must be specific to the program's discipline (Program Name: "${program_name}") and distinct from general Program Outcomes.
      - PSOs must reflect the technical and professional competencies required by the selected societies.

      Lead Society strategic focus:
      - Technical excellence
      - Leadership development
      - Societal impact
      - Innovation & entrepreneurship
      - Ethical responsibility
      - Community engagement

      Constraints:
      1. Use higher-order measurable action verbs (Bloom’s Taxonomy Level 4-6: Analyze, Evaluate, Create / Design).
      2. Each PSO must be specific to the discipline of ${program_name} and clearly different from general Program Outcomes (POs).
      3. Align each PSO with the technical requirements of the Lead Societies: ${selected_societies.lead?.join(", ") || "discipline standards"}.
      4. Structure: Each PSO should be a single, complex sentence (30-50 words).
      5. Tone: Professional, technical, and implementation-oriented.
      6. Output strictly as a JSON array of strings.

      Program-Specific Guardrails:
      ${guardrails}
      
      Example Output Format:
      ["Apply advanced principles...", "Design and conduct experiments..."]
    `;

    const response = await fetch(`${API_URL}?key=${GEMINI_API_KEY}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          responseMimeType: "application/json"
        }
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error("Gemini API Error details:", errText);
      throw new Error(`Gemini API Failed: ${response.statusText}`);
    }

    const data = await response.json();
    const generatedText = data.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!generatedText) {
      throw new Error("No content generated");
    }

    // Clean up and parse the array
    let cleanedText = generatedText
      .replace(/```json/g, "")
      .replace(/```/g, "")
      .trim();
    let parsed: string[] = [];
    try {
      const parsedJson = JSON.parse(cleanedText);
      if (Array.isArray(parsedJson)) {
        parsed = parsedJson.map((p: any) =>
          typeof p === "string" ? p : JSON.stringify(p),
        );
      } else {
        parsed = [cleanedText];
      }
    } catch (e) {
      // Fallback parsing
      parsed = cleanedText
        .split("\n")
        .filter((l: string) => l.trim().length > 10)
        .map((l: string) => l.replace(/^\d+\.\s*/, "").trim());
    }

    const refined: string[] = [];
    const usedRoots = new Set<string>();

    for (const statement of parsed) {
      const enforced = enforcePsoQuality(statement);
      const quality = scorePsoStatement(enforced);

      // Ensure variety in starting verbs
      const firstWord = enforced.split(/\s+/)[0]?.toLowerCase().replace(/[^a-z]/g, "");
      if (firstWord && usedRoots.has(firstWord) && quality.score < 100) {
        quality.score -= 20; // Penalize for duplicate starting verbs
      }
      if (firstWord) {
        usedRoots.add(firstWord);
      }

      refined.push(enforced);
    }

    // Optional: Sort them logically by score before returning, though PSOs are often unordered.
    // For now we just return the cleaned up strings directly since the UI doesn't expect 'quality' meta yet.
    return NextResponse.json({ results: refined });
  } catch (error: any) {
    console.error("PSO Generation Error:", error);
    return NextResponse.json(
      { error: error.message || "Internal Server Error" },
      { status: 500 },
    );
  }
}
