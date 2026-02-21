"use client";

import { useBrowserActions } from "@/hooks/use-browser";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Globe } from "lucide-react";

export default function BrowserPage() {
  const { data: actions } = useBrowserActions();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Browser</h1>
        <p className="text-atlas-text-muted mt-1">
          Shared browser session and action audit log
        </p>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">Action Log</h2>
            <Badge variant="info">{actions?.length ?? 0} actions</Badge>
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-atlas-border text-left text-atlas-text-muted">
                  <th className="pb-2 pr-4">Time</th>
                  <th className="pb-2 pr-4">Agent</th>
                  <th className="pb-2 pr-4">Action</th>
                  <th className="pb-2 pr-4">URL / Selector</th>
                  <th className="pb-2">Session</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-atlas-border">
                {actions?.map((action: any) => (
                  <tr key={action.id} className="hover:bg-atlas-bg/50">
                    <td className="py-2 pr-4 text-xs text-atlas-text-muted whitespace-nowrap">
                      {new Date(action.createdAt).toLocaleString()}
                    </td>
                    <td className="py-2 pr-4">
                      <Badge variant="info">{action.agent?.name ?? action.agentId}</Badge>
                    </td>
                    <td className="py-2 pr-4 font-mono text-xs">{action.action}</td>
                    <td className="py-2 pr-4 text-xs text-atlas-text-muted truncate max-w-[200px]">
                      {action.url || action.selector || "-"}
                    </td>
                    <td className="py-2 text-xs text-atlas-text-muted">{action.sessionName}</td>
                  </tr>
                ))}
                {(!actions || actions.length === 0) && (
                  <tr>
                    <td colSpan={5} className="text-center py-12 text-atlas-text-muted">
                      <Globe className="w-8 h-8 mx-auto mb-2 opacity-50" />
                      No browser actions recorded yet
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
