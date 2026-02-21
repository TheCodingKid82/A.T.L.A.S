"use client";

import { useState } from "react";
import {
  DndContext,
  DragOverlay,
  closestCorners,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import { KanbanColumn } from "./kanban-column";
import { TaskCard } from "./task-card";
import { TaskCreateDialog } from "./task-create-dialog";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";

interface KanbanBoardProps {
  board: any;
  onUpdate: () => void;
}

export function KanbanBoard({ board, onUpdate }: KanbanBoardProps) {
  const [activeTask, setActiveTask] = useState<any>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [createColumnId, setCreateColumnId] = useState<string | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } })
  );

  function handleDragStart(event: DragStartEvent) {
    const task = board.columns
      .flatMap((c: any) => c.tasks)
      .find((t: any) => t.id === event.active.id);
    setActiveTask(task);
  }

  async function handleDragEnd(event: DragEndEvent) {
    setActiveTask(null);
    const { active, over } = event;
    if (!over) return;

    const taskId = active.id;
    const overId = String(over.id);

    // Find target column
    let targetColumnId = overId;
    const isOverTask = board.columns
      .flatMap((c: any) => c.tasks)
      .some((t: any) => t.id === overId);

    if (isOverTask) {
      const col = board.columns.find((c: any) =>
        c.tasks.some((t: any) => t.id === overId)
      );
      if (col) targetColumnId = col.id;
    }

    await fetch(`/api/tasks/${taskId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ columnId: targetColumnId }),
    });

    onUpdate();
  }

  function openCreateDialog(columnId: string) {
    setCreateColumnId(columnId);
    setCreateOpen(true);
  }

  return (
    <>
      <DndContext
        sensors={sensors}
        collisionDetection={closestCorners}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        <div className="flex gap-4 overflow-x-auto flex-1 pb-4">
          {board.columns.map((column: any) => (
            <KanbanColumn
              key={column.id}
              column={column}
              onAddTask={() => openCreateDialog(column.id)}
            />
          ))}
        </div>

        <DragOverlay>
          {activeTask ? <TaskCard task={activeTask} isDragging /> : null}
        </DragOverlay>
      </DndContext>

      <TaskCreateDialog
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        columnId={createColumnId}
        boardId={board.id}
        onCreated={onUpdate}
      />
    </>
  );
}
