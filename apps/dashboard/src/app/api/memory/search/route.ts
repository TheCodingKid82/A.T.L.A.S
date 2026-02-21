import { NextRequest, NextResponse } from "next/server";
import { MemoryService } from "@atlas/services";

const memoryService = new MemoryService();

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const query = searchParams.get("q");
  if (!query) return NextResponse.json({ error: "Missing query" }, { status: 400 });

  const containerTag = searchParams.get("containerTag") || undefined;
  const results = await memoryService.search({ query, containerTag });
  return NextResponse.json(results);
}
