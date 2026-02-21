import { NextRequest, NextResponse } from "next/server";
import { DocumentService } from "@atlas/services";

const documentService = new DocumentService();

export async function GET() {
  const docs = await documentService.list();
  return NextResponse.json(docs);
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const doc = await documentService.create(body);
  return NextResponse.json(doc, { status: 201 });
}
