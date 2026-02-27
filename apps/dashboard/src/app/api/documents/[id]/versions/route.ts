export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { DocumentService } from "@atlas/services";

const documentService = new DocumentService();

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const versions = await documentService.versions(id);
  return NextResponse.json(versions);
}
