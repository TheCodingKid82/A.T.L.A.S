"use client";

import { useDraggable } from "@dnd-kit/core";
import { Badge } from "@/components/ui/badge";
import { GripVertical, Calendar } from "lucide-react";

const priorityVariant: Record<string, "critical" | "error" | "warning" | "default"> = {
  CRITICAL: "critical",
  HIGH: "error",
  MEDIUM: "warning",
  LOW: "default",
};

interface TaskCardProps {
  task: any;
  isDragging?: boolean;
}

export function TaskCard({ task, isDragging = false }: TaskCardProps) {
  const { attributes, listeners, setNodeRef, transform } = useDraggable({
    id: task.id,
  });

  const style = transform
    ? { transform: `translate(${transform.x}px, ${transform.y}px)` }
    : undefined;

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`bg-atlas-surface border border-atlas-border rounded-lg p-3 ${
        isDragging ? "opacity-75 shadow-xl" : "hover:border-atlas-accent/30"
      } transition-colors`}
    >
      <div className="flex items-start gap-2">
        <button
          {...listeners}
          {...attributes}
          className="text-atlas-text-muted hover:text-atlas-text mt-0.5 cursor-grab"
        >
          <GripVertical className="w-3.5 h-3.5" />
        </button>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium truncate">{task.title}</p>
          {task.description && (
            <p className="text-xs text-atlas-text-muted mt-1 line-clamp-2">
              {task.description}
            </p>
          )}
          <div className="flex items-center gap-2 mt-2 flex-wrap">
            <Badge variant={priorityVariant[task.priority] ?? "default"}>
              {task.priority}
            </Badge>
            {task.assignee && (
              <Badge variant="info">{task.assignee.name}</Badge>
            )}
            {task.tags.map((tag: string) => (
              <Badge key={tag} variant="default">
                {tag}
              </Badge>
            ))}
          </div>
          {task.dueDate && (
            <div className="flex items-center gap-1 mt-2 text-xs text-atlas-text-muted">
              <Calendar className="w-3 h-3" />
              {new Date(task.dueDate).toLocaleDateString()}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
