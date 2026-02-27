export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { DocumentService } from "@atlas/services";

const documentService = new DocumentService();

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const doc = await documentService.get(id);
  return NextResponse.json(doc);
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await req.json();
  const doc = await documentService.update(id, body);
  return NextResponse.json(doc);
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await documentService.delete(id);
  return NextResponse.json({ deleted: true });
}
