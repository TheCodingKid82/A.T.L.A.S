export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { WorkSessionService } from "@atlas/services";

const workSessionService = new WorkSessionService();

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const filters = {
    status: (searchParams.get("status") as any) || undefined,
    type: (searchParams.get("type") as any) || undefined,
    requesterId: searchParams.get("requesterId") || undefined,
    limit: searchParams.get("limit") ? parseInt(searchParams.get("limit")!) : undefined,
  };
  const sessions = await workSessionService.listSessions(filters);
  return NextResponse.json(sessions);
}
