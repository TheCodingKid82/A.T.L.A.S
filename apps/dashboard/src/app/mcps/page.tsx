"use client";

import { useMcps } from "@/hooks/use-mcps";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { StatusDot } from "@/components/ui/status-dot";
import { Plug, RefreshCw } from "lucide-react";

export default function McpsPage() {
  const { data: connections, mutate } = useMcps();

  async function handleHealthCheck(id: string) {
    await fetch(`/api/mcps/${id}/health`, { method: "POST" });
    mutate();
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">MCP Registry</h1>
        <p className="text-atlas-text-muted mt-1">
          External MCP server connections and permissions
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {connections?.map((conn: any) => (
          <Card key={conn.id}>
            <CardContent className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <StatusDot status={conn.status} />
                  <h3 className="font-semibold">{conn.name}</h3>
                </div>
                <Badge
                  variant={
                    conn.status === "HEALTHY"
                      ? "success"
                      : conn.status === "UNHEALTHY"
                      ? "error"
                      : "default"
                  }
                >
                  {conn.status}
                </Badge>
              </div>
              <p className="text-xs text-atlas-text-muted font-mono">{conn.url}</p>
              <div className="flex items-center justify-between">
                <Badge variant="default">{conn.transport}</Badge>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleHealthCheck(conn.id)}
                >
                  <RefreshCw className="w-3.5 h-3.5 mr-1" />
                  Check Health
                </Button>
              </div>
              {conn.permissions?.length > 0 && (
                <div className="border-t border-atlas-border pt-2 space-y-1">
                  <p className="text-xs text-atlas-text-muted font-medium">Permissions:</p>
                  {conn.permissions.map((perm: any) => (
                    <div key={perm.id} className="flex items-center gap-2 text-xs">
                      <span className="text-atlas-text">{perm.agent?.name}</span>
                      <span className="text-atlas-text-muted">
                        {perm.allowedTools.length} tools
                      </span>
                    </div>
                  ))}
                </div>
              )}
              {conn.lastHealthCheck && (
                <p className="text-xs text-atlas-text-muted">
                  Last checked: {new Date(conn.lastHealthCheck).toLocaleString()}
                </p>
              )}
            </CardContent>
          </Card>
        ))}
        {(!connections || connections.length === 0) && (
          <Card className="col-span-2">
            <CardContent className="text-center py-12">
              <Plug className="w-12 h-12 text-atlas-text-muted mx-auto mb-3" />
              <p className="text-atlas-text-muted">No MCP connections registered</p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
