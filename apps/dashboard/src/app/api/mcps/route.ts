import { NextResponse } from "next/server";
import { McpRegistryService } from "@atlas/services";

const mcpRegistry = new McpRegistryService();

export async function GET() {
  const connections = await mcpRegistry.list();
  return NextResponse.json(connections);
}
