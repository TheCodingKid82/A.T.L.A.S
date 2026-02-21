"use client";

import { useState } from "react";
import { useMemory } from "@/hooks/use-memory";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input, Textarea } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog } from "@/components/ui/dialog";
import { Plus, Search, Trash2, Brain } from "lucide-react";

const CONTAINER_TAGS = [
  { label: "All", value: "" },
  { label: "Global", value: "atlas-global" },
  { label: "H.E.N.R.Y.", value: "atlas-agent-henry" },
  { label: "P.O.K.E.", value: "atlas-agent-poke" },
  { label: "I.R.I.S.", value: "atlas-agent-iris" },
];

export default function MemoryPage() {
  const [selectedTag, setSelectedTag] = useState("");
  const { data: entries, mutate } = useMemory(selectedTag || undefined);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<any[] | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [newMemory, setNewMemory] = useState({ content: "", containerTag: "atlas-global" });

  async function handleSearch() {
    if (!searchQuery.trim()) return;
    const params = new URLSearchParams({ q: searchQuery });
    if (selectedTag) params.set("containerTag", selectedTag);
    const res = await fetch(`/api/memory/search?${params}`);
    const data = await res.json();
    setSearchResults(Array.isArray(data) ? data : []);
  }

  async function handleCreate() {
    await fetch("/api/memory", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(newMemory),
    });
    setCreateOpen(false);
    setNewMemory({ content: "", containerTag: "atlas-global" });
    mutate();
  }

  async function handleDelete(id: string) {
    await fetch(`/api/memory/${id}`, { method: "DELETE" });
    mutate();
    if (searchResults) {
      setSearchResults(searchResults.filter((r) => r.id !== id));
    }
  }

  const displayEntries = searchResults ?? entries ?? [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Memory</h1>
          <p className="text-atlas-text-muted mt-1">
            Supermemory-backed knowledge store
          </p>
        </div>
        <Button onClick={() => setCreateOpen(true)}>
          <Plus className="w-4 h-4 mr-2" />
          Add Memory
        </Button>
      </div>

      {/* Search & Filter */}
      <div className="flex gap-4">
        <div className="flex-1 flex gap-2">
          <Input
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              if (!e.target.value) setSearchResults(null);
            }}
            placeholder="Search memories..."
            onKeyDown={(e) => e.key === "Enter" && handleSearch()}
          />
          <Button variant="secondary" onClick={handleSearch}>
            <Search className="w-4 h-4" />
          </Button>
        </div>
        <div className="flex gap-1">
          {CONTAINER_TAGS.map((tag) => (
            <button
              key={tag.value}
              onClick={() => {
                setSelectedTag(tag.value);
                setSearchResults(null);
              }}
              className={`px-3 py-1.5 rounded-lg text-xs transition-colors ${
                selectedTag === tag.value
                  ? "bg-atlas-accent/10 text-atlas-accent"
                  : "text-atlas-text-muted hover:text-atlas-text hover:bg-atlas-border/50"
              }`}
            >
              {tag.label}
            </button>
          ))}
        </div>
      </div>

      {/* Memory Entries */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {displayEntries.map((entry: any) => (
          <Card key={entry.id} hover>
            <CardContent>
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1">
                  <p className="text-sm">{entry.content}</p>
                  <div className="flex items-center gap-2 mt-2">
                    <Badge variant="info">{entry.containerTag}</Badge>
                    <span className="text-xs text-atlas-text-muted">
                      {new Date(entry.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                </div>
                <button
                  onClick={() => handleDelete(entry.id)}
                  className="text-atlas-text-muted hover:text-atlas-error p-1"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </CardContent>
          </Card>
        ))}
        {displayEntries.length === 0 && (
          <Card className="col-span-2">
            <CardContent className="text-center py-12">
              <Brain className="w-12 h-12 text-atlas-text-muted mx-auto mb-3" />
              <p className="text-atlas-text-muted">
                {searchResults ? "No results found" : "No memories yet"}
              </p>
            </CardContent>
          </Card>
        )}
      </div>

      <Dialog open={createOpen} onClose={() => setCreateOpen(false)} title="Add Memory">
        <div className="space-y-4">
          <div>
            <label className="text-sm text-atlas-text-muted">Content</label>
            <Textarea
              value={newMemory.content}
              onChange={(e) => setNewMemory({ ...newMemory, content: e.target.value })}
              placeholder="Memory content..."
              rows={4}
            />
          </div>
          <div>
            <label className="text-sm text-atlas-text-muted">Container Tag</label>
            <Input
              value={newMemory.containerTag}
              onChange={(e) => setNewMemory({ ...newMemory, containerTag: e.target.value })}
            />
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setCreateOpen(false)}>Cancel</Button>
            <Button onClick={handleCreate} disabled={!newMemory.content}>Add</Button>
          </div>
        </div>
      </Dialog>
    </div>
  );
}
