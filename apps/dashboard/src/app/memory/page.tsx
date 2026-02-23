"use client";

import { useState } from "react";
import { useMemory } from "@/hooks/use-memory";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input, Textarea } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog } from "@/components/ui/dialog";
import { Plus, Search, Trash2, Brain, Database, Tag, Globe, User, Glasses } from "lucide-react";

const CONTAINER_TAGS = [
  { label: "All", value: "", icon: Database, description: "All memory entries across every scope" },
  { label: "Global", value: "atlas-global", icon: Globe, description: "Shared knowledge accessible to all agents" },
  { label: "H.E.N.R.Y.", value: "atlas-agent-henry", icon: User, description: "Business AI — research, networking, results" },
  { label: "P.O.K.E.", value: "atlas-agent-poke", icon: User, description: "Personal AI — organization, knowledge, errands" },
  { label: "I.R.I.S.", value: "atlas-agent-iris", icon: Glasses, description: "Smart glasses AI — reality interface" },
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
            Supermemory-backed semantic knowledge store
          </p>
        </div>
        <Button onClick={() => setCreateOpen(true)}>
          <Plus className="w-4 h-4 mr-2" />
          Add Memory
        </Button>
      </div>

      {/* Supermemory Setup Info */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Brain className="w-5 h-5 text-atlas-accent" />
            <h2 className="text-lg font-semibold">Supermemory Setup</h2>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-atlas-text-muted">
            A.T.L.A.S. uses <span className="text-atlas-text font-medium">Supermemory</span> as
            its semantic memory layer. Agents store and retrieve knowledge using natural language
            search — memories are automatically embedded and indexed for fast retrieval.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="bg-atlas-bg border border-atlas-border rounded-lg p-3 space-y-1">
              <p className="text-xs text-atlas-text-muted uppercase tracking-wider">How it works</p>
              <p className="text-sm">
                When an agent calls <code className="text-xs bg-atlas-border/50 px-1 py-0.5 rounded">atlas_memory_add</code>,
                the content is sent to Supermemory's API for embedding and also stored locally in Postgres as a fallback.
                Search uses semantic similarity via Supermemory, with local fuzzy matching as backup.
              </p>
            </div>
            <div className="bg-atlas-bg border border-atlas-border rounded-lg p-3 space-y-1">
              <p className="text-xs text-atlas-text-muted uppercase tracking-wider">Container Tags</p>
              <p className="text-sm">
                Memories are scoped using container tags. Use <code className="text-xs bg-atlas-border/50 px-1 py-0.5 rounded">atlas-global</code> for
                shared team knowledge, or agent-specific tags like <code className="text-xs bg-atlas-border/50 px-1 py-0.5 rounded">atlas-agent-henry</code> to
                keep memories private to a single agent.
              </p>
            </div>
          </div>

          {/* Container Tag Reference */}
          <div className="space-y-2">
            <p className="text-xs text-atlas-text-muted uppercase tracking-wider">Available Scopes</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-2">
              {CONTAINER_TAGS.filter(t => t.value).map((tag) => {
                const Icon = tag.icon;
                return (
                  <div key={tag.value} className="flex items-start gap-2 bg-atlas-bg border border-atlas-border rounded-lg p-2.5">
                    <Icon className="w-4 h-4 text-atlas-accent mt-0.5 shrink-0" />
                    <div>
                      <p className="text-xs font-medium">{tag.label}</p>
                      <p className="text-[11px] text-atlas-text-muted leading-tight">{tag.description}</p>
                      <code className="text-[10px] text-atlas-accent/70">{tag.value}</code>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </CardContent>
      </Card>

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
                {searchResults ? "No results found" : "No memories stored yet. Agents can add memories via MCP tools."}
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
