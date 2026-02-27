export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { AgentService } from "@atlas/services";

const agentService = new AgentService();

export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const result = await agentService.regenerateApiKey(id);
  return NextResponse.json(result);
}
