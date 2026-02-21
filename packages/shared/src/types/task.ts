export type TaskPriority = "CRITICAL" | "HIGH" | "MEDIUM" | "LOW";

export interface TaskInfo {
  id: string;
  title: string;
  description: string | null;
  priority: TaskPriority;
  tags: string[];
  position: number;
  columnId: string;
  assigneeId: string | null;
  creatorId: string | null;
  dueDate: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface BoardInfo {
  id: string;
  name: string;
  description: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface ColumnInfo {
  id: string;
  name: string;
  position: number;
  boardId: string;
}
