export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { MemoryService } from "@atlas/services";

const memoryService = new MemoryService();

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const containerTag = searchParams.get("containerTag") || undefined;
  const entries = await memoryService.list({ containerTag });
  return NextResponse.json(entries);
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const entry = await memoryService.add(body);
  return NextResponse.json(entry, { status: 201 });
}
