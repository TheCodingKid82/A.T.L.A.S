"use client";

import { useAgents } from "@/hooks/use-agents";
import { AgentMap } from "@/components/agent-map/agent-map";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { StatusDot } from "@/components/ui/status-dot";

export default function AgentsPage() {
  const { data: agents } = useAgents();

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
                  {agent.apiKeyPrefix}{"***"}
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
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
