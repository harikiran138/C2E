import { NextResponse } from "next/server";
import { computeSemanticSimilarity } from "@/lib/ai-validation";
import { callAI } from "@/lib/curriculum/ai-model-router";
import { resolveProgramAcademicContext, normalizeText } from "@/lib/curriculum/program-context";

export async function POST(request: Request) {
  try {
    const { programId } = await request.json();

    if (!programId) {
      return NextResponse.json(
        { error: "programId is required for isolation-aware mapping" },
        { status: 400 },
      );
    }

    // 1. Resolve Academic Context (Security Boundary)
    const { context, errors: contextErrors } = await resolveProgramAcademicContext(programId);
    if (!context || contextErrors.length > 0) {
      return NextResponse.json(
        { error: contextErrors[0] || "Failed to resolve program isolation context" },
        { status: 404 },
      );
    }

    const { peos, pos: rawPos } = context;
    // Map to the format expected by the prompt logic
    const pos = rawPos.map((p, i) => ({ 
      code: `PO${i+1}`, 
      description: p 
    }));

    if (!peos || peos.length === 0 || !pos || pos.length === 0) {
      return NextResponse.json(
        { error: "PEOs and POs must exist for the program to generate a matrix" },
        { status: 400 },
      );
    }

    const prompt = `
      You are an expert academic curriculum designer specializing in Outcome Based Education (OBE) and NBA/ABET accreditation.
      
      Task: Create a PEO-PO Mapping Matrix.
      The Goal is to determine how much each Program Education Objective (PEO) contributes to or is supported by each Program Outcome (PO).
      
      Program Educational Objectives (PEOs):
      ${peos.map((p: string, i: number) => `PEO ${i + 1}: ${p}`).join("\n")}
      
      Program Outcomes (POs):
      ${pos.map((p: any, i: number) => `PO ${i + 1} (${p.code}): ${p.description}`).join("\n")}
      
      Mapping Logic:
      - 1 = Slight (Low) correlation
      - 2 = Moderate (Medium) correlation
      - 3 = Substantial (High) correlation
      - - = No Correlation
      
      Consider the mapping carefully. Not all PEOs map to all POs. Usually, a PEO maps strongly to 3-5 POs.
      
      Output ONLY a JSON 2D array of strings. 
      The outermost array represents PEOs (Rows).
      The inner arrays represent POs (Columns).
      
      Example: [["1", "3", "-", "2"], ["-", "2", "3", "1"]]
    `;

    let generatedText = await callAI(prompt, "accreditation");

    // Safety cleaning
    let cleanedText = generatedText
      .replace(/```json/g, "")
      .replace(/```/g, "")
      .trim();
    const parsed: string[][] = JSON.parse(cleanedText);

    // --- BIDIRECTIONAL SEMANTIC VALIDATION ENFORCE ---
    // Instead of O(N * M) sequential awaits (which causes Vercel edge timeout), 
    // compute all similarities concurrently using Promise.all

    // 1. Build a flat array of all required prediction tasks
    const similarityTasks: Array<Promise<{ peoIdx: number, poIdx: number, similarity: number }>> = [];

    for (let i = 0; i < peos.length; i++) {
      const peo = peos[i];
      for (let j = 0; j < pos.length; j++) {
        const po = pos[j];
        const poText = po.description || "";

        if (!poText || !peo) {
          similarityTasks.push(Promise.resolve({ peoIdx: i, poIdx: j, similarity: 0 }));
          continue;
        }

        // Push the promise into the array immediately, do not await yet
        const task = computeSemanticSimilarity(peo, poText).then(sim => ({
          peoIdx: i,
          poIdx: j,
          similarity: sim
        }));

        similarityTasks.push(task);
      }
    }

    // 2. Fire and await all calculations simultaneously lightning fast
    const similarityResults = await Promise.all(similarityTasks);

    // 3. Re-structure results back into a 2D matrix look-up map
    const simMap: Record<number, Record<number, number>> = {};
    for (const res of similarityResults) {
      if (!simMap[res.peoIdx]) simMap[res.peoIdx] = {};
      simMap[res.peoIdx][res.poIdx] = res.similarity;
    }

    // 4. Build output matrix logic
    const validatedMatrix: string[][] = [];

    for (let i = 0; i < peos.length; i++) {
      const row = parsed[i] || [];
      const validatedRow: string[] = [];

      for (let j = 0; j < pos.length; j++) {
        const originalWeight = row[j] || "-";
        const similarity = simMap[i]?.[j] || 0;

        let finalWeight = originalWeight;

        // Hard Overrides based on vector proximity
        if (similarity > 0.85) {
          finalWeight = "3";
        } else if (similarity > 0.70 && originalWeight === "-") {
          finalWeight = "2";
        } else if (similarity < 0.45 && (originalWeight === "3" || originalWeight === "2")) {
          finalWeight = "1";
        } else if (similarity < 0.25) {
          finalWeight = "-";
        }

        validatedRow.push(finalWeight);
      }
      validatedMatrix.push(validatedRow);
    }

    return NextResponse.json({ matrix: validatedMatrix, original: parsed });
  } catch (error: any) {
    console.error("PEO-PO Matrix Generation Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
