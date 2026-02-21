export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { TaskService } from "@atlas/services";

const taskService = new TaskService();

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const filters = {
    boardId: searchParams.get("boardId") || undefined,
    columnId: searchParams.get("columnId") || undefined,
    assigneeId: searchParams.get("assigneeId") || undefined,
    priority: (searchParams.get("priority") as any) || undefined,
  };
  const tasks = await taskService.list(filters);
  return NextResponse.json(tasks);
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const task = await taskService.create(body);
  return NextResponse.json(task, { status: 201 });
}
