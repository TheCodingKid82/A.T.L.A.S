import { NextRequest, NextResponse } from "next/server";
import { MemoryService } from "@atlas/services";

const memoryService = new MemoryService();

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const entry = await memoryService.get(params.id);
  return NextResponse.json(entry);
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  await memoryService.delete(params.id);
  return NextResponse.json({ deleted: true });
}
