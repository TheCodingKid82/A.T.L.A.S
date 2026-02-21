import { NextResponse } from "next/server";
import { AgentService } from "@atlas/services";

const agentService = new AgentService();

export async function GET() {
  const agents = await agentService.list();
  return NextResponse.json(agents);
}
