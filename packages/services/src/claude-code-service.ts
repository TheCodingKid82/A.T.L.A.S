import { execFile } from "child_process";
import { promisify } from "util";
import { prisma } from "@atlas/database";
import { CLAUDE_CODE_DEFAULT_TIMEOUT } from "@atlas/shared";

const execFileAsync = promisify(execFile);

interface ClaudeCodeOptions {
  workingDirectory?: string;
  model?: string;
}

async function runClaudeCode(
  args: string[],
  opts?: ClaudeCodeOptions
): Promise<{ stdout: string; parsed: unknown }> {
  try {
    const { stdout } = await execFileAsync("claude", args, {
      timeout: CLAUDE_CODE_DEFAULT_TIMEOUT,
      cwd: opts?.workingDirectory || undefined,
      maxBuffer: 10 * 1024 * 1024, // 10MB
    });
    let parsed: unknown;
    try {
      parsed = JSON.parse(stdout);
    } catch {
      parsed = { rawOutput: stdout.trim() };
    }
    return { stdout: stdout.trim(), parsed };
  } catch (error: any) {
    throw new Error(`Claude Code command failed: ${error.message}`);
  }
}

export class ClaudeCodeService {
  async runPrompt(
    agentId: string,
    prompt: string,
    opts?: ClaudeCodeOptions
  ) {
    const start = Date.now();
    const args = ["--print", prompt, "--output-format", "json"];
    if (opts?.model) {
      args.push("--model", opts.model);
    }

    const { parsed } = await runClaudeCode(args, opts);
    const duration = Date.now() - start;

    // Extract sessionId from JSON output if available
    const sessionId =
      parsed && typeof parsed === "object" && "session_id" in (parsed as any)
        ? (parsed as any).session_id
        : null;

    const action = await prisma.claudeCodeAction.create({
      data: {
        agentId,
        action: "prompt",
        sessionId,
        prompt,
        workingDirectory: opts?.workingDirectory || null,
        result: parsed as any,
        duration,
      },
    });

    return {
      success: true,
      actionId: action.id,
      sessionId,
      result: parsed,
      duration,
    };
  }

  async continueSession(
    agentId: string,
    sessionId: string,
    prompt: string,
    opts?: Omit<ClaudeCodeOptions, "model">
  ) {
    const start = Date.now();
    const args = [
      "--print",
      prompt,
      "--output-format",
      "json",
      "--resume",
      sessionId,
    ];

    const { parsed } = await runClaudeCode(args, opts);
    const duration = Date.now() - start;

    const action = await prisma.claudeCodeAction.create({
      data: {
        agentId,
        action: "session_continue",
        sessionId,
        prompt,
        workingDirectory: opts?.workingDirectory || null,
        result: parsed as any,
        duration,
      },
    });

    return {
      success: true,
      actionId: action.id,
      sessionId,
      result: parsed,
      duration,
    };
  }

  async listSessions(agentId?: string, limit = 50) {
    return prisma.claudeCodeAction.findMany({
      where: agentId ? { agentId } : undefined,
      include: { agent: true },
      orderBy: { createdAt: "desc" },
      take: limit,
    });
  }
}
