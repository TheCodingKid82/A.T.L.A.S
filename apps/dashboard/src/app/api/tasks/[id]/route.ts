import { NextRequest, NextResponse } from "next/server";
import { TaskService } from "@atlas/services";

const taskService = new TaskService();

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const task = await taskService.get(params.id);
  return NextResponse.json(task);
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const body = await req.json();
  const task = await taskService.update(params.id, body);
  return NextResponse.json(task);
}
