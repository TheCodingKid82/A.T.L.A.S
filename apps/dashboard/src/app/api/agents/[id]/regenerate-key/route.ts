export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { AgentService } from "@atlas/services";

const agentService = new AgentService();

export async function POST(_req: NextRequest, { params }: { params: { id: string } }) {
  const result = await agentService.regenerateApiKey(params.id);
  return NextResponse.json(result);
}
