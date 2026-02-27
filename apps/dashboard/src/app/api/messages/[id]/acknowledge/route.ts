export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { MessageService } from "@atlas/services";

const messageService = new MessageService();

export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const msg = await messageService.acknowledge(id);
  return NextResponse.json(msg);
}
