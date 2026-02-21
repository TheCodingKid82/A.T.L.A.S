export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { McpRegistryService } from "@atlas/services";

const mcpRegistry = new McpRegistryService();

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const connection = await mcpRegistry.get(params.id);
  return NextResponse.json(connection);
}
