import { NextResponse } from "next/server";
import { MessageService } from "@atlas/services";

const messageService = new MessageService();

export async function GET() {
  const channels = await messageService.listChannels();
  return NextResponse.json(channels);
}
