"use client";

import { useState } from "react";
import { useBoards } from "@/hooks/use-boards";
import { KanbanBoard } from "@/components/kanban/kanban-board";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { Input, Textarea } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Plus, Kanban } from "lucide-react";

export default function BoardsPage() {
  const { data: boards, mutate } = useBoards();
  const [selectedBoardId, setSelectedBoardId] = useState<string | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [newBoard, setNewBoard] = useState({ name: "", description: "" });

  const selectedBoard = boards?.find((b: any) => b.id === selectedBoardId) ?? boards?.[0];

  async function handleCreateBoard() {
    await fetch("/api/boards", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(newBoard),
    });
    setCreateOpen(false);
    setNewBoard({ name: "", description: "" });
    mutate();
  }

  return (
    <div className="space-y-6 h-full flex flex-col">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Kanban Boards</h1>
          <p className="text-atlas-text-muted mt-1">
            Manage tasks across your agent ecosystem
          </p>
        </div>
        <Button onClick={() => setCreateOpen(true)}>
          <Plus className="w-4 h-4 mr-2" />
          New Board
        </Button>
      </div>

      {/* Board Selector */}
      <div className="flex gap-2">
        {boards?.map((board: any) => (
          <button
            key={board.id}
            onClick={() => setSelectedBoardId(board.id)}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm transition-colors ${
              selectedBoard?.id === board.id
                ? "bg-atlas-accent/10 text-atlas-accent"
                : "text-atlas-text-muted hover:text-atlas-text hover:bg-atlas-border/50"
            }`}
          >
            <Kanban className="w-3.5 h-3.5" />
            {board.name}
          </button>
        ))}
      </div>

      {/* Kanban Board */}
      {selectedBoard ? (
        <KanbanBoard board={selectedBoard} onUpdate={mutate} />
      ) : (
        <Card>
          <CardContent className="text-center py-12">
            <p className="text-atlas-text-muted">
              No boards yet. Create one to get started.
            </p>
          </CardContent>
        </Card>
      )}

      <Dialog
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        title="Create Board"
      >
        <div className="space-y-4">
          <div>
            <label className="text-sm text-atlas-text-muted">Name</label>
            <Input
              value={newBoard.name}
              onChange={(e) =>
                setNewBoard({ ...newBoard, name: e.target.value })
              }
              placeholder="Board name"
            />
          </div>
          <div>
            <label className="text-sm text-atlas-text-muted">Description</label>
            <Textarea
              value={newBoard.description}
              onChange={(e) =>
                setNewBoard({ ...newBoard, description: e.target.value })
              }
              placeholder="Optional description"
              rows={3}
            />
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setCreateOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreateBoard} disabled={!newBoard.name}>
              Create
            </Button>
          </div>
        </div>
      </Dialog>
    </div>
  );
}
