"use client";

import { useAgents } from "@/hooks/use-agents";
import { useBoards } from "@/hooks/use-boards";
import { useChannels } from "@/hooks/use-messages";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { StatusDot } from "@/components/ui/status-dot";
import { Bot, Kanban, MessageSquare, Brain } from "lucide-react";

export default function DashboardPage() {
  const { data: agents } = useAgents();
  const { data: boards } = useBoards();
  const { data: channels } = useChannels();

  const taskCount =
    boards?.reduce(
      (acc: number, b: any) =>
        acc + b.columns.reduce((c: number, col: any) => c + col.tasks.length, 0),
      0
    ) ?? 0;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-atlas-text">A.T.L.A.S. Dashboard</h1>
        <p className="text-atlas-text-muted mt-1">
          Automated Task Logic and Agent Supervision
        </p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="flex items-center gap-4">
            <div className="p-3 rounded-xl bg-atlas-accent/10">
              <Bot className="w-6 h-6 text-atlas-accent" />
            </div>
            <div>
              <p className="text-2xl font-bold">{agents?.length ?? 0}</p>
              <p className="text-sm text-atlas-text-muted">Agents</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="flex items-center gap-4">
            <div className="p-3 rounded-xl bg-atlas-warning/10">
              <Kanban className="w-6 h-6 text-atlas-warning" />
            </div>
            <div>
              <p className="text-2xl font-bold">{taskCount}</p>
              <p className="text-sm text-atlas-text-muted">Tasks</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="flex items-center gap-4">
            <div className="p-3 rounded-xl bg-atlas-success/10">
              <MessageSquare className="w-6 h-6 text-atlas-success" />
            </div>
            <div>
              <p className="text-2xl font-bold">{channels?.length ?? 0}</p>
              <p className="text-sm text-atlas-text-muted">Channels</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="flex items-center gap-4">
            <div className="p-3 rounded-xl bg-purple-500/10">
              <Brain className="w-6 h-6 text-purple-400" />
            </div>
            <div>
              <p className="text-2xl font-bold">{boards?.length ?? 0}</p>
              <p className="text-sm text-atlas-text-muted">Boards</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Agent Status */}
      <Card>
        <CardHeader>
          <h2 className="text-lg font-semibold">Agent Status</h2>
        </CardHeader>
        <CardContent className="space-y-3">
          {agents?.map((agent: any) => (
            <div
              key={agent.id}
              className="flex items-center justify-between p-3 rounded-lg bg-atlas-bg"
            >
              <div className="flex items-center gap-3">
                <StatusDot status={agent.status} />
                <div>
                  <p className="font-medium text-sm">{agent.name}</p>
                  <p className="text-xs text-atlas-text-muted">
                    {agent.description}
                  </p>
                </div>
              </div>
              <Badge
                variant={
                  agent.status === "ONLINE"
                    ? "success"
                    : agent.status === "ERROR"
                    ? "error"
                    : agent.status === "PROCESSING"
                    ? "warning"
                    : "default"
                }
              >
                {agent.status}
              </Badge>
            </div>
          ))}
          {!agents && (
            <p className="text-sm text-atlas-text-muted">Loading agents...</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
