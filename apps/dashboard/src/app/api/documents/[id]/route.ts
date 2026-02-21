import { NextRequest, NextResponse } from "next/server";
import { DocumentService } from "@atlas/services";

const documentService = new DocumentService();

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const doc = await documentService.get(params.id);
  return NextResponse.json(doc);
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const body = await req.json();
  const doc = await documentService.update(params.id, body);
  return NextResponse.json(doc);
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  await documentService.delete(params.id);
  return NextResponse.json({ deleted: true });
}
