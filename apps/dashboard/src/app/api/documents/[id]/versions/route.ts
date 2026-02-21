export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { DocumentService } from "@atlas/services";

const documentService = new DocumentService();

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const versions = await documentService.versions(params.id);
  return NextResponse.json(versions);
}
