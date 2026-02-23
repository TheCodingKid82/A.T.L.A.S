"use client";

import { useState } from "react";
import { useAgents } from "@/hooks/use-agents";
import { AgentMap } from "@/components/agent-map/agent-map";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { StatusDot } from "@/components/ui/status-dot";
import { Dialog } from "@/components/ui/dialog";
import { KeyRound, Copy, Check, RefreshCw } from "lucide-react";

export default function AgentsPage() {
  const { data: agents, mutate } = useAgents();
  const [keyModal, setKeyModal] = useState<{ agentName: string; key: string } | null>(null);
  const [copied, setCopied] = useState(false);
  const [regenerating, setRegenerating] = useState<string | null>(null);

  async function handleRegenerate(agentId: string, agentName: string) {
    setRegenerating(agentId);
    try {
      const res = await fetch(`/api/agents/${agentId}/regenerate-key`, { method: "POST" });
      const data = await res.json();
      setKeyModal({ agentName, key: data.key });
      mutate();
    } finally {
      setRegenerating(null);
    }
  }

  function handleCopy() {
    if (keyModal) {
      navigator.clipboard.writeText(keyModal.key);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Agents</h1>
        <p className="text-atlas-text-muted mt-1">
          Monitor and manage your AI agent ecosystem
        </p>
      </div>

      {/* System Map */}
      <Card className="h-[400px]">
        <CardHeader>
          <h2 className="text-lg font-semibold">System Map</h2>
        </CardHeader>
        <div className="h-[calc(100%-57px)]">
          <AgentMap agents={agents ?? []} />
        </div>
      </Card>

      {/* Agent Detail Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {agents?.map((agent: any) => (
          <Card key={agent.id}>
            <CardContent className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <StatusDot status={agent.status} />
                  <h3 className="font-semibold">{agent.name}</h3>
                </div>
                <Badge
                  variant={
                    agent.status === "ONLINE"
                      ? "success"
                      : agent.status === "ERROR"
                      ? "error"
                      : "default"
                  }
                >
                  {agent.status}
                </Badge>
              </div>
              <p className="text-sm text-atlas-text-muted">{agent.description}</p>
              <div className="text-xs text-atlas-text-muted space-y-1">
                <p>
                  <span className="text-atlas-text">Slug:</span> {agent.slug}
                </p>
                <p>
                  <span className="text-atlas-text">API Key:</span>{" "}
                  <code className="bg-atlas-border/50 px-1.5 py-0.5 rounded text-[11px]">
                    {agent.apiKeyPrefix}{"***"}
                  </code>
                </p>
                <p>
                  <span className="text-atlas-text">Rate Limit:</span>{" "}
                  {agent.rateLimit}/min
                </p>
                {agent.lastActiveAt && (
                  <p>
                    <span className="text-atlas-text">Last Active:</span>{" "}
                    {new Date(agent.lastActiveAt).toLocaleString()}
                  </p>
                )}
              </div>
              <Button
                variant="secondary"
                className="w-full mt-2"
                onClick={() => handleRegenerate(agent.id, agent.name)}
                disabled={regenerating === agent.id}
              >
                {regenerating === agent.id ? (
                  <RefreshCw className="w-3.5 h-3.5 mr-2 animate-spin" />
                ) : (
                  <KeyRound className="w-3.5 h-3.5 mr-2" />
                )}
                {regenerating === agent.id ? "Generating..." : "Generate New API Key"}
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* API Key Modal */}
      <Dialog
        open={!!keyModal}
        onClose={() => { setKeyModal(null); setCopied(false); }}
        title={`API Key — ${keyModal?.agentName}`}
      >
        <div className="space-y-4">
          <p className="text-sm text-atlas-text-muted">
            Copy this key now. It won't be shown again.
          </p>
          <div className="flex items-center gap-2">
            <code className="flex-1 bg-atlas-bg border border-atlas-border rounded-lg px-3 py-2.5 text-sm font-mono break-all select-all">
              {keyModal?.key}
            </code>
            <Button variant="secondary" onClick={handleCopy} className="shrink-0">
              {copied ? (
                <Check className="w-4 h-4 text-green-400" />
              ) : (
                <Copy className="w-4 h-4" />
              )}
            </Button>
          </div>
          <p className="text-xs text-atlas-text-muted">
            Use this as a Bearer token: <code className="text-atlas-text">Authorization: Bearer {keyModal?.key}</code>
          </p>
          <div className="flex justify-end">
            <Button onClick={() => { setKeyModal(null); setCopied(false); }}>Done</Button>
          </div>
        </div>
      </Dialog>
    </div>
  );
}
