import { NextRequest, NextResponse } from "next/server";
import {
  getCompanyProfile,
  getDbMode,
  resetCompanyProfile,
  saveCompanyProfile,
} from "@/lib/db";

export async function GET() {
  try {
    const [company, dbMode] = await Promise.all([
      getCompanyProfile(),
      getDbMode(),
    ]);
    return NextResponse.json({ company, dbMode });
  } catch (err) {
    return NextResponse.json(
      { error: (err as Error).message || "Failed to load company profile" },
      { status: 500 }
    );
  }
}

export async function PUT(req: NextRequest) {
  try {
    const body = await req.json();
    const updated = body?.reset
      ? await resetCompanyProfile()
      : await saveCompanyProfile(body);
    return NextResponse.json({ company: updated });
  } catch (err) {
    return NextResponse.json(
      { error: (err as Error).message || "Failed to save company profile" },
      { status: 500 }
    );
  }
}
