import { NextResponse } from "next/server";
import { poAgent }     from "@/lib/ai/po-agent";

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

export async function POST(request: Request) {
  try {
    const { programName, count = 3, priorities, institutionName } = await request.json();

    if (!programName) {
      return NextResponse.json(
        { error: "programName is required" },
        { status: 400 },
      );
    }

    const result = await poAgent({
      programName,
      count: Math.min(count, 12), // max 12 standard POs
      priorities,
      institutionName,
      geminiApiKey: GEMINI_API_KEY,
    });

    return NextResponse.json({ pos: result.pos, ranked: result.ranked });
  } catch (error: any) {
    console.error("PO Generation Error:", error);
    return NextResponse.json(
      { error: error.message || "Internal Server Error" },
      { status: 500 },
    );
  }
}
