import { NextRequest, NextResponse } from "next/server";
import { MessageService } from "@atlas/services";

const messageService = new MessageService();

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const channelId = searchParams.get("channelId");
  if (!channelId) return NextResponse.json({ error: "Missing channelId" }, { status: 400 });

  const messages = await messageService.list({ channelId });
  return NextResponse.json(messages);
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const msg = await messageService.send(body);
  return NextResponse.json(msg, { status: 201 });
}
