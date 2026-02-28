"use client";

import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Monitor, Loader2 } from "lucide-react";

interface SessionData {
  id: string;
  title: string;
  status: string;
  vncUrl: string | null;
  executionMode: string | null;
}

export default function LiveViewerPage() {
  const params = useParams();
  const router = useRouter();
  const sessionId = params.id as string;
  const [session, setSession] = useState<SessionData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/work-requests/${sessionId}`)
      .then((res) => res.json())
      .then((data) => {
        setSession(data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [sessionId]);

  // Poll for session updates
  useEffect(() => {
    const interval = setInterval(async () => {
      try {
        const res = await fetch(`/api/work-requests/${sessionId}`);
        if (res.ok) {
          setSession(await res.json());
        }
      } catch {}
    }, 5000);
    return () => clearInterval(interval);
  }, [sessionId]);

  const vncUrl =
    session?.vncUrl || process.env.NEXT_PUBLIC_WORKER_VNC_URL || null;

  const iframeSrc = vncUrl
    ? `${vncUrl}/vnc.html?autoconnect=true&resize=scale&view_only=true`
    : null;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <button
          onClick={() => router.push("/work-requests")}
          className="p-2 rounded-lg hover:bg-atlas-border/30 transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div className="flex-1">
          <h1 className="text-xl font-bold flex items-center gap-2">
            <Monitor className="w-5 h-5 text-atlas-accent" />
            Live Terminal
          </h1>
          {session && (
            <p className="text-sm text-atlas-text-muted mt-0.5">
              {session.title}
            </p>
          )}
        </div>
        {session && (
          <Badge
            variant={
              session.status === "ACTIVE"
                ? "default"
                : session.status === "COMPLETED"
                ? "success"
                : session.status === "FAILED"
                ? "error"
                : "warning"
            }
          >
            {session.status}
          </Badge>
        )}
      </div>

      <Card className="overflow-hidden">
        <CardContent className="p-0">
          {loading ? (
            <div className="flex items-center justify-center h-[600px] bg-black">
              <Loader2 className="w-8 h-8 text-atlas-accent animate-spin" />
            </div>
          ) : !iframeSrc ? (
            <div className="flex flex-col items-center justify-center h-[600px] bg-black text-atlas-text-muted">
              <Monitor className="w-12 h-12 mb-3 opacity-50" />
              <p className="text-sm">No VNC stream available</p>
              <p className="text-xs mt-1">
                {session?.executionMode === "print"
                  ? "This session is running in print mode (no visual terminal)"
                  : "The worker VNC URL is not configured"}
              </p>
            </div>
          ) : (
            <iframe
              src={iframeSrc}
              className="w-full h-[600px] border-0 bg-black"
              title="Live Terminal View"
              allow="clipboard-read; clipboard-write"
            />
          )}
        </CardContent>
      </Card>

      {session && (
        <div className="grid grid-cols-3 gap-4 text-xs">
          <div>
            <span className="text-atlas-text-muted">Session ID:</span>{" "}
            <code className="bg-atlas-border/50 px-1 py-0.5 rounded">
              {session.id}
            </code>
          </div>
          <div>
            <span className="text-atlas-text-muted">Mode:</span>{" "}
            <Badge variant="default">
              {session.executionMode || "unknown"}
            </Badge>
          </div>
          {vncUrl && (
            <div>
              <span className="text-atlas-text-muted">VNC:</span>{" "}
              <code className="bg-atlas-border/50 px-1 py-0.5 rounded">
                {vncUrl}
              </code>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
