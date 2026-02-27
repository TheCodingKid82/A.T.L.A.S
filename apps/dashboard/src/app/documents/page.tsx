"use client";

import { useState } from "react";
import { useDocuments } from "@/hooks/use-documents";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input, Textarea } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog } from "@/components/ui/dialog";
import { Plus, FileText, Trash2, Clock, Pencil } from "lucide-react";

export default function DocumentsPage() {
  const { data: documents, mutate } = useDocuments();
  const [createOpen, setCreateOpen] = useState(false);
  const [newDoc, setNewDoc] = useState({ title: "", content: "", tags: "" });
  const [versionsOpen, setVersionsOpen] = useState<string | null>(null);
  const [versions, setVersions] = useState<any[]>([]);
  const [viewDoc, setViewDoc] = useState<any | null>(null);
  const [editing, setEditing] = useState(false);
  const [editContent, setEditContent] = useState("");
  const [editTitle, setEditTitle] = useState("");

  async function handleCreate() {
    await fetch("/api/documents", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...newDoc,
        tags: newDoc.tags ? newDoc.tags.split(",").map((t) => t.trim()) : [],
      }),
    });
    setCreateOpen(false);
    setNewDoc({ title: "", content: "", tags: "" });
    mutate();
  }

  async function handleDelete(id: string) {
    await fetch(`/api/documents/${id}`, { method: "DELETE" });
    if (viewDoc?.id === id) setViewDoc(null);
    mutate();
  }

  async function showVersions(id: string) {
    const res = await fetch(`/api/documents/${id}/versions`);
    const data = await res.json();
    setVersions(data);
    setVersionsOpen(id);
  }

  async function openDocument(id: string) {
    const res = await fetch(`/api/documents/${id}`);
    const data = await res.json();
    setViewDoc(data);
    setEditing(false);
  }

  function startEditing() {
    if (!viewDoc) return;
    setEditTitle(viewDoc.title);
    const latestContent =
      viewDoc.versions?.[0]?.content ?? "";
    setEditContent(latestContent);
    setEditing(true);
  }

  async function handleSave() {
    if (!viewDoc) return;
    await fetch(`/api/documents/${viewDoc.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: editTitle,
        content: editContent,
        changelog: "Updated via dashboard",
      }),
    });
    setEditing(false);
    await openDocument(viewDoc.id);
    mutate();
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Documents</h1>
          <p className="text-atlas-text-muted mt-1">
            Document storage with version history
          </p>
        </div>
        <Button onClick={() => setCreateOpen(true)}>
          <Plus className="w-4 h-4 mr-2" />
          New Document
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {documents?.map((doc: any) => (
          <Card
            key={doc.id}
            hover
            className="cursor-pointer"
            onClick={() => openDocument(doc.id)}
          >
            <CardContent>
              <div className="flex items-start gap-3">
                <div className="p-2 rounded-lg bg-atlas-accent/10">
                  <FileText className="w-5 h-5 text-atlas-accent" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-medium text-sm truncate">{doc.title}</h3>
                  <p className="text-xs text-atlas-text-muted mt-1">
                    {doc.mimeType}
                  </p>
                  <div className="flex items-center gap-2 mt-2 flex-wrap">
                    {doc.tags.map((tag: string) => (
                      <Badge key={tag} variant="default">{tag}</Badge>
                    ))}
                  </div>
                  <div className="flex items-center gap-2 mt-2">
                    <button
                      onClick={(e) => { e.stopPropagation(); showVersions(doc.id); }}
                      className="text-xs text-atlas-accent hover:underline flex items-center gap-1"
                    >
                      <Clock className="w-3 h-3" />
                      {doc.versions?.[0]?.version ?? 1} version(s)
                    </button>
                    <button
                      onClick={(e) => { e.stopPropagation(); handleDelete(doc.id); }}
                      className="text-xs text-atlas-text-muted hover:text-atlas-error"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
        {(!documents || documents.length === 0) && (
          <Card className="col-span-full">
            <CardContent className="text-center py-12">
              <FileText className="w-12 h-12 text-atlas-text-muted mx-auto mb-3" />
              <p className="text-atlas-text-muted">No documents yet</p>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Create Dialog */}
      <Dialog open={createOpen} onClose={() => setCreateOpen(false)} title="Create Document">
        <div className="space-y-4">
          <div>
            <label className="text-sm text-atlas-text-muted">Title</label>
            <Input
              value={newDoc.title}
              onChange={(e) => setNewDoc({ ...newDoc, title: e.target.value })}
              placeholder="Document title"
            />
          </div>
          <div>
            <label className="text-sm text-atlas-text-muted">Content</label>
            <Textarea
              value={newDoc.content}
              onChange={(e) => setNewDoc({ ...newDoc, content: e.target.value })}
              placeholder="Document content..."
              rows={6}
            />
          </div>
          <div>
            <label className="text-sm text-atlas-text-muted">Tags (comma-separated)</label>
            <Input
              value={newDoc.tags}
              onChange={(e) => setNewDoc({ ...newDoc, tags: e.target.value })}
              placeholder="e.g. report, q1"
            />
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setCreateOpen(false)}>Cancel</Button>
            <Button onClick={handleCreate} disabled={!newDoc.title || !newDoc.content}>Create</Button>
          </div>
        </div>
      </Dialog>

      {/* View/Edit Document Dialog */}
      <Dialog
        open={!!viewDoc}
        onClose={() => { setViewDoc(null); setEditing(false); }}
        title={editing ? "Edit Document" : viewDoc?.title ?? "Document"}
      >
        {viewDoc && !editing && (
          <div className="space-y-4">
            <div className="flex items-center gap-2 flex-wrap">
              <Badge variant="default">{viewDoc.mimeType}</Badge>
              {viewDoc.tags?.map((tag: string) => (
                <Badge key={tag} variant="default">{tag}</Badge>
              ))}
              <span className="text-xs text-atlas-text-muted ml-auto">
                {new Date(viewDoc.updatedAt).toLocaleString()}
              </span>
            </div>
            <div className="bg-atlas-bg rounded-lg p-4 border border-atlas-border max-h-96 overflow-auto">
              <pre className="text-sm whitespace-pre-wrap font-sans">
                {viewDoc.versions?.[0]?.content ?? "No content"}
              </pre>
            </div>
            <div className="flex justify-between">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => { showVersions(viewDoc.id); setViewDoc(null); }}
              >
                <Clock className="w-3 h-3 mr-1" />
                Version history
              </Button>
              <div className="flex gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleDelete(viewDoc.id)}
                  className="text-atlas-error hover:text-atlas-error"
                >
                  <Trash2 className="w-3 h-3 mr-1" />
                  Delete
                </Button>
                <Button size="sm" onClick={startEditing}>
                  <Pencil className="w-3 h-3 mr-1" />
                  Edit
                </Button>
              </div>
            </div>
          </div>
        )}
        {viewDoc && editing && (
          <div className="space-y-4">
            <div>
              <label className="text-sm text-atlas-text-muted">Title</label>
              <Input
                value={editTitle}
                onChange={(e) => setEditTitle(e.target.value)}
              />
            </div>
            <div>
              <label className="text-sm text-atlas-text-muted">Content</label>
              <Textarea
                value={editContent}
                onChange={(e) => setEditContent(e.target.value)}
                rows={12}
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="ghost" onClick={() => setEditing(false)}>Cancel</Button>
              <Button onClick={handleSave} disabled={!editTitle || !editContent}>Save</Button>
            </div>
          </div>
        )}
      </Dialog>

      {/* Versions Dialog */}
      <Dialog
        open={!!versionsOpen}
        onClose={() => setVersionsOpen(null)}
        title="Version History"
      >
        <div className="space-y-3">
          {versions.map((v: any) => (
            <div key={v.id} className="flex items-center justify-between p-3 rounded-lg bg-atlas-bg">
              <div>
                <p className="text-sm font-medium">Version {v.version}</p>
                <p className="text-xs text-atlas-text-muted">{v.changelog}</p>
              </div>
              <div className="text-xs text-atlas-text-muted">
                {new Date(v.createdAt).toLocaleString()}
              </div>
            </div>
          ))}
          {versions.length === 0 && (
            <p className="text-sm text-atlas-text-muted text-center py-4">No versions</p>
          )}
        </div>
      </Dialog>
    </div>
  );
}
