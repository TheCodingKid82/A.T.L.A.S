import { prisma } from "@atlas/database";
import type { Prisma } from "@atlas/database";
import { DEFAULT_BOARD_COLUMNS } from "@atlas/shared";

export class TaskService {
  async create(data: {
    title: string;
    description?: string;
    priority?: "CRITICAL" | "HIGH" | "MEDIUM" | "LOW";
    tags?: string[];
    columnId?: string;
    boardId?: string;
    assigneeId?: string;
    creatorId?: string;
    dueDate?: string;
  }) {
    let columnId = data.columnId;

    if (!columnId && data.boardId) {
      const firstColumn = await prisma.column.findFirst({
        where: { boardId: data.boardId },
        orderBy: { position: "asc" },
      });
      if (firstColumn) columnId = firstColumn.id;
    }

    if (!columnId) {
      const firstColumn = await prisma.column.findFirst({
        orderBy: { position: "asc" },
      });
      if (!firstColumn) throw new Error("No columns exist. Create a board first.");
      columnId = firstColumn.id;
    }

    const maxPosition = await prisma.task.aggregate({
      where: { columnId },
      _max: { position: true },
    });

    return prisma.task.create({
      data: {
        title: data.title,
        description: data.description,
        priority: data.priority ?? "MEDIUM",
        tags: data.tags ?? [],
        position: (maxPosition._max.position ?? -1) + 1,
        columnId,
        assigneeId: data.assigneeId,
        creatorId: data.creatorId,
        dueDate: data.dueDate ? new Date(data.dueDate) : undefined,
      },
      include: { column: true, assignee: true, creator: true },
    });
  }

  async update(
    id: string,
    data: {
      title?: string;
      description?: string;
      priority?: "CRITICAL" | "HIGH" | "MEDIUM" | "LOW";
      tags?: string[];
      columnId?: string;
      position?: number;
      assigneeId?: string | null;
      dueDate?: string | null;
    }
  ) {
    return prisma.task.update({
      where: { id },
      data: {
        ...data,
        dueDate: data.dueDate === null ? null : data.dueDate ? new Date(data.dueDate) : undefined,
      },
      include: { column: true, assignee: true, creator: true },
    });
  }

  async get(id: string) {
    return prisma.task.findUniqueOrThrow({
      where: { id },
      include: { column: { include: { board: true } }, assignee: true, creator: true },
    });
  }

  async list(filters?: {
    boardId?: string;
    columnId?: string;
    assigneeId?: string;
    priority?: "CRITICAL" | "HIGH" | "MEDIUM" | "LOW";
    tags?: string[];
    limit?: number;
  }) {
    const where: Prisma.TaskWhereInput = {};

    if (filters?.columnId) where.columnId = filters.columnId;
    if (filters?.boardId) where.column = { boardId: filters.boardId };
    if (filters?.assigneeId) where.assigneeId = filters.assigneeId;
    if (filters?.priority) where.priority = filters.priority;
    if (filters?.tags?.length) where.tags = { hasSome: filters.tags };

    return prisma.task.findMany({
      where,
      include: { column: true, assignee: true, creator: true },
      orderBy: [{ column: { position: "asc" } }, { position: "asc" }],
      take: filters?.limit ?? 50,
    });
  }

  async close(id: string) {
    const task = await prisma.task.findUniqueOrThrow({
      where: { id },
      include: { column: { include: { board: true } } },
    });

    const completeColumn = await prisma.column.findFirst({
      where: { boardId: task.column.boardId, name: "Complete" },
    });

    if (!completeColumn) throw new Error("No 'Complete' column found");

    return prisma.task.update({
      where: { id },
      data: { columnId: completeColumn.id },
      include: { column: true, assignee: true, creator: true },
    });
  }

  async listBoards() {
    return prisma.board.findMany({
      include: {
        columns: {
          orderBy: { position: "asc" },
          include: { tasks: { include: { assignee: true }, orderBy: { position: "asc" } } },
        },
      },
    });
  }

  async createBoard(data: { name: string; description?: string; columns?: string[] }) {
    const columnNames = data.columns?.length ? data.columns : [...DEFAULT_BOARD_COLUMNS];
    return prisma.board.create({
      data: {
        name: data.name,
        description: data.description,
        columns: {
          create: columnNames.map((name, i) => ({ name, position: i })),
        },
      },
      include: { columns: { orderBy: { position: "asc" } } },
    });
  }
}
