export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { AgentService } from "@atlas/services";

const agentService = new AgentService();

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const agent = await agentService.get(id);
  return NextResponse.json(agent);
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await req.json();
  const agent = await agentService.updateStatus(id, body.status);
  return NextResponse.json(agent);
}
