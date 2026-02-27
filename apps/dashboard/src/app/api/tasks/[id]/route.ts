export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { TaskService } from "@atlas/services";

const taskService = new TaskService();

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const task = await taskService.get(id);
  return NextResponse.json(task);
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await req.json();
  const task = await taskService.update(id, body);
  return NextResponse.json(task);
}
