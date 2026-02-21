"use client";

import { useState } from "react";
import { Dialog } from "@/components/ui/dialog";
import { Input, Textarea, Select } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useAgents } from "@/hooks/use-agents";

interface TaskCreateDialogProps {
  open: boolean;
  onClose: () => void;
  columnId: string | null;
  boardId: string;
  onCreated: () => void;
}

export function TaskCreateDialog({
  open,
  onClose,
  columnId,
  boardId,
  onCreated,
}: TaskCreateDialogProps) {
  const { data: agents } = useAgents();
  const [form, setForm] = useState({
    title: "",
    description: "",
    priority: "MEDIUM",
    assigneeId: "",
    tags: "",
  });

  async function handleSubmit() {
    await fetch("/api/tasks", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...form,
        columnId,
        boardId,
        assigneeId: form.assigneeId || undefined,
        tags: form.tags
          ? form.tags.split(",").map((t) => t.trim())
          : [],
      }),
    });
    setForm({ title: "", description: "", priority: "MEDIUM", assigneeId: "", tags: "" });
    onClose();
    onCreated();
  }

  return (
    <Dialog open={open} onClose={onClose} title="Create Task">
      <div className="space-y-4">
        <div>
          <label className="text-sm text-atlas-text-muted">Title</label>
          <Input
            value={form.title}
            onChange={(e) => setForm({ ...form, title: e.target.value })}
            placeholder="Task title"
          />
        </div>
        <div>
          <label className="text-sm text-atlas-text-muted">Description</label>
          <Textarea
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
            placeholder="Optional description"
            rows={3}
          />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-sm text-atlas-text-muted">Priority</label>
            <Select
              value={form.priority}
              onChange={(e) => setForm({ ...form, priority: e.target.value })}
            >
              <option value="LOW">Low</option>
              <option value="MEDIUM">Medium</option>
              <option value="HIGH">High</option>
              <option value="CRITICAL">Critical</option>
            </Select>
          </div>
          <div>
            <label className="text-sm text-atlas-text-muted">Assignee</label>
            <Select
              value={form.assigneeId}
              onChange={(e) =>
                setForm({ ...form, assigneeId: e.target.value })
              }
            >
              <option value="">Unassigned</option>
              {agents?.map((agent: any) => (
                <option key={agent.id} value={agent.id}>
                  {agent.name}
                </option>
              ))}
            </Select>
          </div>
        </div>
        <div>
          <label className="text-sm text-atlas-text-muted">
            Tags (comma-separated)
          </label>
          <Input
            value={form.tags}
            onChange={(e) => setForm({ ...form, tags: e.target.value })}
            placeholder="e.g. frontend, urgent"
          />
        </div>
        <div className="flex justify-end gap-2">
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={!form.title}>
            Create Task
          </Button>
        </div>
      </div>
    </Dialog>
  );
}
