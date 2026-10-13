import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";

export async function GET() {
  try {
    // 1. Try reading from backend FastAPI endpoint
    const mlUrl = process.env.ML_SERVICE_URL || "http://127.0.0.1:8000";
    try {
      const res = await fetch(`${mlUrl}/ml/evaluation`, { cache: "no-store" });
      if (res.ok) {
        const data = await res.json();
        return NextResponse.json(data);
      }
    } catch {
      // Fallback to local evaluation_results.json file
    }

    // 2. Direct filesystem read from backend models folder
    const fallbackPath = path.resolve(process.cwd(), "..", "backend", "models", "evaluation_results.json");
    if (fs.existsSync(fallbackPath)) {
      const content = fs.readFileSync(fallbackPath, "utf-8");
      return NextResponse.json(JSON.parse(content));
    }

    return NextResponse.json({ error: "Evaluation results not found" }, { status: 404 });
  } catch (error) {
    console.error("Failed to load evaluation data:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
