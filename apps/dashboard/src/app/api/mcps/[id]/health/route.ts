export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { McpRegistryService } from "@atlas/services";

const mcpRegistry = new McpRegistryService();

export async function POST(_req: NextRequest, { params }: { params: { id: string } }) {
  const result = await mcpRegistry.healthCheck(params.id);
  return NextResponse.json(result);
}
