import { NextResponse } from "next/server";
import { psoAgent } from "@/lib/ai/pso-agent";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { selected_societies, number_of_psos, program_name } = body;

    const hasSelection =
      Boolean(selected_societies?.lead?.length) ||
      Boolean(selected_societies?.co_lead?.length) ||
      Boolean(selected_societies?.coLead?.length) ||
      Boolean(selected_societies?.cooperating?.length);

    if (!hasSelection) {
      return NextResponse.json(
        { error: "At least one professional society must be selected." },
        { status: 400 },
      );
    }

    const count = Number(number_of_psos || 0);
    if (!Number.isFinite(count) || count < 1 || count > 10) {
      return NextResponse.json(
        { error: "Invalid number of PSOs (1-10)." },
        { status: 400 },
      );
    }

    const result = await psoAgent({
      programName: program_name || "Engineering Program",
      count,
      selectedSocieties: selected_societies,
      geminiApiKey: process.env.GEMINI_API_KEY,
    });

    return NextResponse.json(result);
  } catch (error: any) {
    console.error("PSO Generation Error:", error);
    return NextResponse.json(
      { error: error.message || "Internal Server Error" },
      { status: 500 },
    );
  }
}
