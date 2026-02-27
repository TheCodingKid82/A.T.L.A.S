export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { WorkSessionService } from "@atlas/services";

const workSessionService = new WorkSessionService();

export async function POST() {
  const result = await workSessionService.cleanupStaleSessions();
  return NextResponse.json(result);
}
