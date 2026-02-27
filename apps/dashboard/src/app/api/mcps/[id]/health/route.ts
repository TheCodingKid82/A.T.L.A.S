export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { McpRegistryService } from "@atlas/services";

const mcpRegistry = new McpRegistryService();

export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const result = await mcpRegistry.healthCheck(id);
  return NextResponse.json(result);
}
