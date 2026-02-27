export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { McpRegistryService } from "@atlas/services";

const mcpRegistry = new McpRegistryService();

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const connection = await mcpRegistry.get(id);
  return NextResponse.json(connection);
}
