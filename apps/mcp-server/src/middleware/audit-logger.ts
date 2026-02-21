import { prisma } from "@atlas/database";

export async function logAudit(data: {
  agentId: string;
  tool: string;
  input?: unknown;
  output?: unknown;
  duration?: number;
}) {
  try {
    await prisma.auditLog.create({
      data: {
        agentId: data.agentId,
        tool: data.tool,
        input: data.input as any,
        output: data.output as any,
        duration: data.duration,
      },
    });
  } catch (e) {
    console.error("Audit log failed:", e);
  }
}
