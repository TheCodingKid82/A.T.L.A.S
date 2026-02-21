import { NextResponse } from "next/server";
import { BrowserService } from "@atlas/services";

const browserService = new BrowserService();

export async function GET() {
  const actions = await browserService.listActions();
  return NextResponse.json(actions);
}
