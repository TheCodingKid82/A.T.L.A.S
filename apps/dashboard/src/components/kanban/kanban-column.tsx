"use client";

import { useDroppable } from "@dnd-kit/core";
import { TaskCard } from "./task-card";
import { Plus } from "lucide-react";

interface KanbanColumnProps {
  column: any;
  onAddTask: () => void;
}

export function KanbanColumn({ column, onAddTask }: KanbanColumnProps) {
  const { setNodeRef, isOver } = useDroppable({ id: column.id });

  return (
    <div
      ref={setNodeRef}
      className={`flex-shrink-0 w-72 bg-atlas-bg rounded-xl border transition-colors ${
        isOver ? "border-atlas-accent/50" : "border-atlas-border"
      }`}
    >
      <div className="p-3 border-b border-atlas-border flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h3 className="font-medium text-sm">{column.name}</h3>
          <span className="text-xs text-atlas-text-muted bg-atlas-border px-1.5 py-0.5 rounded-full">
            {column.tasks.length}
          </span>
        </div>
        <button
          onClick={onAddTask}
          className="text-atlas-text-muted hover:text-atlas-text p-1 rounded hover:bg-atlas-border/50"
        >
          <Plus className="w-3.5 h-3.5" />
        </button>
      </div>

      <div className="p-2 space-y-2 min-h-[100px]">
        {column.tasks.map((task: any) => (
          <TaskCard key={task.id} task={task} />
        ))}
      </div>
    </div>
  );
}
