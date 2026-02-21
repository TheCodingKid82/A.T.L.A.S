export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { MessageService } from "@atlas/services";

const messageService = new MessageService();

export async function POST(_req: NextRequest, { params }: { params: { id: string } }) {
  const msg = await messageService.acknowledge(params.id);
  return NextResponse.json(msg);
}
