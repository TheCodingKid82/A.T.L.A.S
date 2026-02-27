export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { MemoryService } from "@atlas/services";

const memoryService = new MemoryService();

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const entry = await memoryService.get(id);
  return NextResponse.json(entry);
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await memoryService.delete(id);
  return NextResponse.json({ deleted: true });
}
