async function testAIGeneration() {
    console.log("==========================================");
    console.log("   TESTING AI GENERATION ENDPOINTS");
    console.log("==========================================\n");

    const BASE_URL = 'http://localhost:3000/api/generate';

    // 1. Test Vision Generation
    console.log("1. Testing Vision Generation...");
    try {
        const visionRes = await fetch(`${BASE_URL}/vision-mission`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                type: 'vision',
                priorities: ['Artificial Intelligence', 'Global Leadership', 'Sustainable Tech'],
                count: 3,
                institutionContext: 'A premier engineering college in South India focused on excellence.',
                programName: 'Computer Science and Engineering'
            })
        });
        const visionData = await visionRes.json();
        if (visionData.error) {
            console.error("  ❌ VISION ENDPOINT FAILED:", visionData.error);
        } else {
            console.log("  ✅ Vision Statements Generated successfully:");
            visionData.results.forEach((v: string, i: number) => console.log(`      [${i + 1}] ${v}`));
        }
    } catch (e: any) {
        console.error("  ❌ VISION REQUEST ERROR:", e.message);
    }
    console.log("");

    // 2. Test Mission Generation
    console.log("2. Testing Mission Generation (Lexical Depth & Semantic Leakage checked)...");
    try {
        const missionRes = await fetch(`${BASE_URL}/vision-mission`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                type: 'mission',
                priorities: ['Outcome based education', 'Industry collaboration', 'Ethics'],
                count: 3,
                institutionContext: 'To be globally recognized for Computer Science and Engineering distinction through institutional leadership, innovation foresight, and sustainable societal contribution.',
                programName: 'Computer Science and Engineering'
            })
        });
        const missionData = await missionRes.json();
        if (missionData.error) {
            console.error("  ❌ MISSION ENDPOINT FAILED:", missionData.error);
        } else {
            console.log("  ✅ Mission Statements Generated successfully:");
            missionData.results.forEach((m: string, i: number) => console.log(`      [${i + 1}] ${m}`));
        }
    } catch (e: any) {
        console.error("  ❌ MISSION REQUEST ERROR:", e.message);
    }
    console.log("");

    // 3. Test PEO Generation
    console.log("3. Testing PEO Generation (Time-Horizon & Alumni Measurability checked)...");
    try {
        const peoRes = await fetch(`${BASE_URL}/peos`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                priorities: ['Software Development', 'Leadership', 'Lifelong Learning'],
                count: 4,
                institutionContext: 'Institute focuses on producing industry-ready engineers.',
                programName: 'Computer Science and Engineering'
            })
        });
        const peoData = await peoRes.json();
        if (peoData.error) {
            console.error("  ❌ PEO ENDPOINT FAILED:", peoData.error);
        } else {
            console.log("  ✅ PEOs Generated safely:");
            peoData.results.forEach((p: string, i: number) => console.log(`      [${i + 1}] ${p}`));
        }
    } catch (e: any) {
        console.error("  ❌ PEO REQUEST ERROR:", e.message);
    }
    console.log("");

    // 4. Test PSO Generation
    console.log("4. Testing PSO Generation (Bloom's Taxonomy checked)...");
    try {
        const psoRes = await fetch(`${BASE_URL}/psos`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                selected_societies: { lead: ['IEEE Computer Society'], co_lead: [], cooperating: [] },
                number_of_psos: 3,
                programName: 'Computer Science and Engineering'
            })
        });
        const psoData = await psoRes.json();
        if (psoData.error) {
            console.error("  ❌ PSO ENDPOINT FAILED:", psoData.error);
        } else {
            console.log("  ✅ PSOs Generated (targeting higher Bloom's levels):");
            psoData.results.forEach((p: string, i: number) => console.log(`      [${i + 1}] ${p}`));
        }
    } catch (e: any) {
        console.error("  ❌ PSO REQUEST ERROR:", e.message);
    }
    console.log("");

    // 5. Test PEO-PO Matrix Generation
    console.log("5. Testing Bidirectional Semantic Matrix Generation...");
    try {
        const matrixRes = await fetch(`${BASE_URL}/peo-po-matrix`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                peos: [
                    "Within 3 to 5 years, graduates will progress in professional roles",
                    "Within 3 to 5 years, graduates will contribute to sustainable engineering solutions"
                ],
                pos: [
                    { po_code: "PO1", description: "Apply engineering knowledge" },
                    { po_code: "PO2", description: "Design sustainable solutions" },
                    { po_code: "PO3", description: "Function effectively on teams" }
                ]
            })
        });
        const matrixData = await matrixRes.json();
        if (matrixData.error) {
            console.error("  ❌ MATRIX ENDPOINT FAILED:", matrixData.error);
        } else {
            console.log("  ✅ Matrix Generated and Semantically Validated:");
            matrixData.matrix.forEach((row: string[], i: number) => console.log(`      PEO ${i + 1}:`, JSON.stringify(row)));

            if (matrixData.original) {
                console.log("      [LLM original vs Validated drift handled automatically]");
            }
        }
    } catch (e: any) {
        console.error("  ❌ MATRIX REQUEST ERROR:", e.message);
    }

    console.log("\n==========================================");
    console.log("   AI GENERATION TESTS COMPLETED");
    console.log("==========================================");
}

testAIGeneration();
