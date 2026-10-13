import { NextResponse } from "next/server";

export async function POST() {
  return NextResponse.json(
    {
      error: "Static seed endpoint is disabled. FinPilot AI operates with real authenticated users.",
    },
    { status: 410 }
  );
}
