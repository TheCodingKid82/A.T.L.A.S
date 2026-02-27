export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { WorkSessionService } from "@atlas/services";

const workSessionService = new WorkSessionService();

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const session = await workSessionService.getSession(id);
  return NextResponse.json(session);
}
