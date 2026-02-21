"use client";

import { useCallback, useMemo } from "react";
import {
  ReactFlow,
  Background,
  Controls,
  type Node,
  type Edge,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";

interface AgentMapProps {
  agents: any[];
}

export function AgentMap({ agents }: AgentMapProps) {
  const nodes: Node[] = useMemo(() => {
    const hubNode: Node = {
      id: "atlas-hub",
      type: "default",
      position: { x: 300, y: 150 },
      data: {
        label: "A.T.L.A.S.",
      },
      style: {
        background: "#6366f1",
        color: "#fff",
        border: "2px solid #818cf8",
        borderRadius: "12px",
        padding: "12px 20px",
        fontWeight: "bold",
        fontSize: "14px",
      },
    };

    const agentNodes: Node[] = agents.map((agent, i) => {
      const angle = (i * 2 * Math.PI) / agents.length - Math.PI / 2;
      const radius = 180;
      const x = 300 + radius * Math.cos(angle) - 50;
      const y = 150 + radius * Math.sin(angle) - 20;

      const statusColors: Record<string, string> = {
        ONLINE: "#22c55e",
        OFFLINE: "#94a3b8",
        ERROR: "#ef4444",
        PROCESSING: "#f59e0b",
      };

      return {
        id: agent.id,
        type: "default",
        position: { x, y },
        data: { label: agent.name },
        style: {
          background: "#12121a",
          color: "#e2e8f0",
          border: `2px solid ${statusColors[agent.status] || "#1e1e2e"}`,
          borderRadius: "10px",
          padding: "8px 16px",
          fontSize: "12px",
        },
      };
    });

    return [hubNode, ...agentNodes];
  }, [agents]);

  const edges: Edge[] = useMemo(() => {
    return agents.map((agent) => ({
      id: `edge-${agent.id}`,
      source: "atlas-hub",
      target: agent.id,
      style: {
        stroke: agent.status === "ONLINE" ? "#6366f1" : "#1e1e2e",
        strokeWidth: 2,
      },
      animated: agent.status === "ONLINE" || agent.status === "PROCESSING",
    }));
  }, [agents]);

  return (
    <ReactFlow
      nodes={nodes}
      edges={edges}
      fitView
      proOptions={{ hideAttribution: true }}
      style={{ background: "#0a0a0f" }}
    >
      <Background color="#1e1e2e" gap={20} />
      <Controls
        style={{ background: "#12121a", border: "1px solid #1e1e2e", borderRadius: "8px" }}
      />
    </ReactFlow>
  );
}
