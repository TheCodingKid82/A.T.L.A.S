import { NextRequest, NextResponse } from "next/server";
import { TaskService } from "@atlas/services";

const taskService = new TaskService();

export async function GET() {
  const boards = await taskService.listBoards();
  return NextResponse.json(boards);
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const board = await taskService.createBoard(body);
  return NextResponse.json(board, { status: 201 });
}
