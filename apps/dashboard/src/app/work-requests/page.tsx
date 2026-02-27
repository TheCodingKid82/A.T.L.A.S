"use client";

import { useState } from "react";
import { useWorkSessions } from "@/hooks/use-work-requests";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Hammer,
  Clock,
  Loader2,
  CheckCircle2,
  XCircle,
  Ban,
  ChevronDown,
  ChevronRight,
  Pause,
  User,
  Bot,
} from "lucide-react";

const STATUS_CONFIG: Record<string, { icon: any; color: string; variant: any }> = {
  ACTIVE: { icon: Loader2, color: "text-blue-400", variant: "default" },
  PAUSED: { icon: Pause, color: "text-yellow-400", variant: "warning" },
  COMPLETED: { icon: CheckCircle2, color: "text-green-400", variant: "success" },
  FAILED: { icon: XCircle, color: "text-red-400", variant: "error" },
  CANCELLED: { icon: Ban, color: "text-atlas-text-muted", variant: "default" },
};

const MSG_STATUS_CONFIG: Record<string, { color: string }> = {
  PENDING: { color: "text-yellow-400" },
  PROCESSING: { color: "text-blue-400" },
  COMPLETED: { color: "text-green-400" },
  FAILED: { color: "text-red-400" },
};

const TYPE_LABELS: Record<string, string> = {
  CODE: "Code",
  RESEARCH: "Research",
  GITHUB: "GitHub",
  BROWSER: "Browser",
  GENERAL: "General",
};

export default function WorkRequestsPage() {
  const { data: sessions } = useWorkSessions();
  const [expanded, setExpanded] = useState<string | null>(null);
  const [filter, setFilter] = useState<string | "ALL">("ALL");

  const filtered =
    filter === "ALL"
      ? sessions
      : sessions?.filter((s: any) => s.status === filter);

  const counts = {
    ACTIVE: sessions?.filter((s: any) => s.status === "ACTIVE").length ?? 0,
    PAUSED: sessions?.filter((s: any) => s.status === "PAUSED").length ?? 0,
    COMPLETED: sessions?.filter((s: any) => s.status === "COMPLETED").length ?? 0,
    FAILED: sessions?.filter((s: any) => s.status === "FAILED").length ?? 0,
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Work Sessions</h1>
        <p className="text-atlas-text-muted mt-1">
          Persistent work sessions with C.O.D.E.
        </p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {(["ACTIVE", "PAUSED", "COMPLETED", "FAILED"] as const).map((status) => {
          const config = STATUS_CONFIG[status];
          const Icon = config.icon;
          return (
            <Card
              key={status}
              className={`cursor-pointer transition-colors ${
                filter === status ? "ring-1 ring-atlas-accent" : ""
              }`}
              onClick={() => setFilter(filter === status ? "ALL" : status)}
            >
              <CardContent className="flex items-center gap-3">
                <Icon
                  className={`w-5 h-5 ${config.color} ${
                    status === "ACTIVE" ? "animate-spin" : ""
                  }`}
                />
                <div>
                  <p className="text-xl font-bold">{counts[status]}</p>
                  <p className="text-xs text-atlas-text-muted">{status}</p>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Session List */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <h2 className="text-lg font-semibold">
            {filter === "ALL" ? "All Sessions" : filter}
          </h2>
          {filter !== "ALL" && (
            <button
              onClick={() => setFilter("ALL")}
              className="text-xs text-atlas-accent hover:underline"
            >
              Show all
            </button>
          )}
        </CardHeader>
        <CardContent className="space-y-2">
          {!filtered && (
            <p className="text-sm text-atlas-text-muted">Loading...</p>
          )}
          {filtered?.length === 0 && (
            <p className="text-sm text-atlas-text-muted">No work sessions found.</p>
          )}
          {filtered?.map((session: any) => {
            const config = STATUS_CONFIG[session.status] ?? STATUS_CONFIG.ACTIVE;
            const Icon = config.icon;
            const isExpanded = expanded === session.id;
            const messageCount = session.messages?.length ?? 0;

            return (
              <div
                key={session.id}
                className="rounded-lg border border-atlas-border bg-atlas-bg overflow-hidden"
              >
                <button
                  onClick={() => setExpanded(isExpanded ? null : session.id)}
                  className="w-full flex items-center gap-3 p-3 text-left hover:bg-atlas-border/30 transition-colors"
                >
                  {isExpanded ? (
                    <ChevronDown className="w-4 h-4 text-atlas-text-muted shrink-0" />
                  ) : (
                    <ChevronRight className="w-4 h-4 text-atlas-text-muted shrink-0" />
                  )}
                  <Icon
                    className={`w-4 h-4 ${config.color} shrink-0 ${
                      session.status === "ACTIVE" ? "animate-spin" : ""
                    }`}
                  />
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm truncate">{session.title}</p>
                    <p className="text-xs text-atlas-text-muted">
                      by {session.requester?.name ?? "Unknown"} &middot;{" "}
                      {messageCount} message{messageCount !== 1 ? "s" : ""} &middot;{" "}
                      {new Date(session.createdAt).toLocaleString()}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <Badge variant={config.variant}>{session.status}</Badge>
                    <Badge variant="default">{TYPE_LABELS[session.type] ?? session.type}</Badge>
                    <Badge
                      variant={
                        session.priority === "CRITICAL"
                          ? "error"
                          : session.priority === "HIGH"
                          ? "warning"
                          : "default"
                      }
                    >
                      {session.priority}
                    </Badge>
                  </div>
                </button>

                {isExpanded && (
                  <div className="px-4 pb-4 space-y-3 border-t border-atlas-border pt-3">
                    {/* Session metadata */}
                    <div className="grid grid-cols-2 gap-3 text-xs">
                      <div>
                        <span className="text-atlas-text-muted">Session ID:</span>{" "}
                        <code className="bg-atlas-border/50 px-1 py-0.5 rounded">
                          {session.id}
                        </code>
                      </div>
                      {session.worker && (
                        <div>
                          <span className="text-atlas-text-muted">Worker:</span>{" "}
                          {session.worker.name}
                        </div>
                      )}
                      {session.workingDirectory && (
                        <div>
                          <span className="text-atlas-text-muted">Directory:</span>{" "}
                          <code className="bg-atlas-border/50 px-1 py-0.5 rounded">
                            {session.workingDirectory}
                          </code>
                        </div>
                      )}
                      {session.claudeSessionId && (
                        <div>
                          <span className="text-atlas-text-muted">Claude Session:</span>{" "}
                          <code className="bg-atlas-border/50 px-1 py-0.5 rounded text-xs">
                            {session.claudeSessionId.slice(0, 12)}...
                          </code>
                        </div>
                      )}
                    </div>

                    {/* Messages / Conversation */}
                    <div>
                      <p className="text-xs font-medium text-atlas-text-muted mb-2">
                        Conversation
                      </p>
                      <div className="space-y-2">
                        {session.messages?.map((msg: any) => {
                          const isUser = msg.role === "USER";
                          const msgStatus = MSG_STATUS_CONFIG[msg.status];
                          return (
                            <div
                              key={msg.id}
                              className={`rounded-lg p-3 ${
                                isUser
                                  ? "bg-atlas-surface border border-atlas-border"
                                  : "bg-atlas-accent/10 border border-atlas-accent/20"
                              }`}
                            >
                              <div className="flex items-center gap-2 mb-1">
                                {isUser ? (
                                  <User className="w-3 h-3 text-atlas-text-muted" />
                                ) : (
                                  <Bot className="w-3 h-3 text-atlas-accent" />
                                )}
                                <span className="text-xs font-medium">
                                  {isUser ? "Request" : "C.O.D.E."}
                                </span>
                                <Badge
                                  variant={
                                    msg.status === "COMPLETED"
                                      ? "success"
                                      : msg.status === "FAILED"
                                      ? "error"
                                      : msg.status === "PROCESSING"
                                      ? "default"
                                      : "warning"
                                  }
                                  className="text-[10px] px-1 py-0"
                                >
                                  {msg.status}
                                </Badge>
                                {msg.duration && (
                                  <span className="text-[10px] text-atlas-text-muted">
                                    {Math.round(msg.duration / 1000)}s
                                  </span>
                                )}
                                <span className="text-[10px] text-atlas-text-muted ml-auto">
                                  {new Date(msg.createdAt).toLocaleTimeString()}
                                </span>
                              </div>
                              <p className="text-sm whitespace-pre-wrap">
                                {msg.content}
                              </p>
                              {msg.errorMessage && (
                                <p className="text-xs text-red-400 mt-1">
                                  Error: {msg.errorMessage}
                                </p>
                              )}
                              {msg.result && (
                                <details className="mt-2">
                                  <summary className="text-xs text-atlas-text-muted cursor-pointer hover:text-atlas-text">
                                    View result
                                  </summary>
                                  <pre className="text-xs bg-atlas-bg rounded p-2 mt-1 overflow-auto max-h-48">
                                    {typeof msg.result === "string"
                                      ? msg.result
                                      : JSON.stringify(msg.result, null, 2)}
                                  </pre>
                                </details>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </CardContent>
      </Card>
    </div>
  );
}
