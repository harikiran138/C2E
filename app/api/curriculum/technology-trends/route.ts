import { NextResponse } from "next/server";
import { getTechnologyTrendSnapshot } from "@/lib/curriculum/technology-trend-engine";

function normalizeText(value: unknown): string {
  return String(value || "").replace(/\s+/g, " ").trim();
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const programName = normalizeText(searchParams.get("programName"));
    const programType = normalizeText(searchParams.get("programType"));
    const specialization = normalizeText(searchParams.get("specialization"));

    const input = [programName, programType, specialization].filter(Boolean).join(" ");
    if (!input) {
      return NextResponse.json(
        { error: "programName or programType is required" },
        { status: 400 },
      );
    }

    const snapshot = getTechnologyTrendSnapshot(input);
    return NextResponse.json({ snapshot });
  } catch (error: any) {
    console.error("Technology trends fetch error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to fetch technology trend snapshot." },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const programType = normalizeText(body.programType);
    const specialization = normalizeText(body.specialization);
    const programName = normalizeText(body.programName);

    const input = [programName, programType, specialization].filter(Boolean).join(" ");
    if (!input) {
      return NextResponse.json(
        { error: "programName or programType is required" },
        { status: 400 },
      );
    }

    const snapshot = getTechnologyTrendSnapshot(input);
    return NextResponse.json({ snapshot });
  } catch (error: any) {
    console.error("Technology trends create error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to generate technology trend snapshot." },
      { status: 500 },
    );
  }
}
