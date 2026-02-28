import * as pty from "node-pty";
import { WORKER_EXECUTION_TIMEOUT } from "@atlas/shared";

// Comprehensive ANSI escape sequence regex (from ansi-regex package)
const ANSI_REGEX =
  // eslint-disable-next-line no-control-regex
  /[\u001B\u009B][[\]()#;?]*(?:(?:(?:(?:;[-a-zA-Z\d\/#&.:=?%@~_]+)*|[a-zA-Z\d]+(?:;[-a-zA-Z\d\/#&.:=?%@~_]*)*)?\u0007)|(?:(?:\d{1,4}(?:;\d{0,4})*)?[\dA-PR-TZcf-nq-uy=><~]))/g;

function stripAnsi(text: string): string {
  return text.replace(ANSI_REGEX, "");
}

/** Normalize PTY output: strip ANSI, handle \r line overwrites, normalize newlines. */
function normalizeText(text: string): string {
  let result = stripAnsi(text);
  // Handle \r\n → \n
  result = result.replace(/\r\n/g, "\n");
  // Handle bare \r (cursor return = line overwrite) — keep only last segment
  result = result
    .split("\n")
    .map((line) => {
      const parts = line.split("\r");
      return parts[parts.length - 1];
    })
    .join("\n");
  return result;
}

export interface Session {
  id: string;
  pty: pty.IPty;
  buffer: string;
  onData: ((chunk: string) => void) | null;
}

let sessionCounter = 0;

export class InputManager {
  private sessions = new Map<string, Session>();

  /**
   * Spawn a new interactive Claude CLI session in a PTY.
   */
  async spawnSession(opts: {
    cwd: string;
    resume?: string;
    model?: string;
  }): Promise<Session> {
    const args: string[] = ["--dangerously-skip-permissions"];

    if (opts.model) {
      args.push("--model", opts.model);
    }
    if (opts.resume) {
      args.push("--resume", opts.resume);
    }

    // Exclude ANTHROPIC_API_KEY — we use OAuth credentials
    const env: Record<string, string> = {};
    for (const [k, v] of Object.entries(process.env)) {
      if (k !== "ANTHROPIC_API_KEY" && v !== undefined) {
        env[k] = v;
      }
    }

    console.log(
      `[InputManager] Spawning: claude ${args.join(" ")} (cwd: ${opts.cwd})`
    );

    const ptyProcess = pty.spawn("claude", args, {
      name: "xterm-256color",
      cols: 200,
      rows: 50,
      cwd: opts.cwd,
      env,
    });

    const id = `session-${++sessionCounter}`;
    const session: Session = {
      id,
      pty: ptyProcess,
      buffer: "",
      onData: null,
    };

    ptyProcess.onData((data: string) => {
      session.buffer += data;
      if (session.onData) session.onData(data);
    });

    ptyProcess.onExit(({ exitCode, signal }) => {
      console.log(
        `[InputManager] Session ${id} exited (code=${exitCode}, signal=${signal})`
      );
      this.sessions.delete(id);
    });

    this.sessions.set(id, session);

    // Wait for the CLI to become ready (show initial prompt)
    await this.waitForReady(session, 30_000);
    console.log(`[InputManager] Session ${id} ready`);

    return session;
  }

  /**
   * Send a user prompt to a session and collect the full response.
   */
  async sendPrompt(
    session: Session,
    prompt: string,
    timeout = WORKER_EXECUTION_TIMEOUT
  ): Promise<string> {
    return this.sendAndCollect(session, prompt, timeout);
  }

  /**
   * Send a slash command (e.g., /remote-control) to a session.
   */
  async sendCommand(
    session: Session,
    command: string,
    timeout = 30_000
  ): Promise<string> {
    return this.sendAndCollect(session, command, timeout);
  }

  /**
   * Send a command and return after a delay without waiting for completion.
   * Used for long-lived commands like /remote-control that never "finish".
   */
  async fireAndForget(
    session: Session,
    command: string,
    waitMs = 10_000
  ): Promise<string> {
    const bufferStart = session.buffer.length;
    session.pty.write(command + "\r");
    await new Promise((resolve) => setTimeout(resolve, waitMs));
    const raw = session.buffer.slice(bufferStart);
    return this.cleanResponse(raw, command);
  }

  /**
   * Kill a specific session.
   */
  kill(session: Session): void {
    console.log(`[InputManager] Killing session ${session.id}`);
    try {
      session.pty.kill();
    } catch {}
    this.sessions.delete(session.id);
  }

  /**
   * Kill all sessions (for shutdown).
   */
  killAll(): void {
    for (const session of this.sessions.values()) {
      console.log(`[InputManager] Killing session ${session.id}`);
      try {
        session.pty.kill();
      } catch {}
    }
    this.sessions.clear();
  }

  /**
   * Send text to the PTY and wait for the response to complete.
   * Uses quiet-period detection: once output stops flowing for QUIET_MS,
   * we consider the response complete.
   */
  private sendAndCollect(
    session: Session,
    text: string,
    timeout: number
  ): Promise<string> {
    return new Promise((resolve) => {
      const bufferStart = session.buffer.length;
      let lastDataTime = Date.now();
      let hasOutput = false;
      let checkTimer: ReturnType<typeof setInterval>;
      let timeoutTimer: ReturnType<typeof setTimeout>;
      const QUIET_MS = 5_000; // 5 seconds of silence = done
      const CHECK_MS = 500; // Check every 500ms

      const cleanup = () => {
        session.onData = null;
        clearInterval(checkTimer);
        clearTimeout(timeoutTimer);
      };

      const extractResult = (): string => {
        const raw = session.buffer.slice(bufferStart);
        return this.cleanResponse(raw, text);
      };

      session.onData = () => {
        lastDataTime = Date.now();
        hasOutput = true;
      };

      // Periodically check if output has settled
      checkTimer = setInterval(() => {
        if (!hasOutput) return;

        const quietMs = Date.now() - lastDataTime;
        if (quietMs >= QUIET_MS) {
          cleanup();
          resolve(extractResult());
        }
      }, CHECK_MS);

      // Overall timeout — resolve with what we have (caller kills session if needed)
      timeoutTimer = setTimeout(() => {
        cleanup();
        console.warn(
          `[InputManager] Session ${session.id} timed out after ${timeout / 1000}s`
        );
        resolve(extractResult() || "[Timed out]");
      }, timeout);

      // Send the input
      session.pty.write(text + "\r");
    });
  }

  /**
   * Wait for the CLI to show its initial prompt after spawning.
   * Detects readiness by waiting for output to settle.
   */
  private waitForReady(session: Session, timeout: number): Promise<void> {
    return new Promise((resolve) => {
      let lastDataTime = Date.now();
      let hasOutput = false;
      let checkTimer: ReturnType<typeof setInterval>;
      let timeoutTimer: ReturnType<typeof setTimeout>;
      const QUIET_MS = 2_000; // 2 seconds of silence = ready
      const CHECK_MS = 500;

      const cleanup = () => {
        session.onData = null;
        clearInterval(checkTimer);
        clearTimeout(timeoutTimer);
      };

      session.onData = () => {
        lastDataTime = Date.now();
        hasOutput = true;
      };

      checkTimer = setInterval(() => {
        if (!hasOutput) return;
        if (Date.now() - lastDataTime >= QUIET_MS) {
          cleanup();
          resolve();
        }
      }, CHECK_MS);

      timeoutTimer = setTimeout(() => {
        cleanup();
        console.warn(
          "[InputManager] Ready detection timed out — proceeding anyway"
        );
        resolve();
      }, timeout);
    });
  }

  /**
   * Clean PTY output: strip ANSI codes, normalize line endings,
   * remove echoed input and trailing prompt artifacts.
   */
  private cleanResponse(raw: string, sentText: string): string {
    const text = normalizeText(raw);

    const lines = text.split("\n");

    // Find where our echoed input ends — skip it
    const inputPrefix = sentText.slice(0, Math.min(50, sentText.length));
    let startIdx = 0;
    for (let i = 0; i < Math.min(lines.length, 20); i++) {
      if (lines[i].includes(inputPrefix)) {
        startIdx = i + 1;
        break;
      }
    }

    // Remove trailing empty lines and prompt characters
    let endIdx = lines.length;
    for (let i = lines.length - 1; i >= startIdx; i--) {
      const line = lines[i].trim();
      if (line === "" || /^[❯>$%]\s*$/.test(line)) {
        endIdx = i;
      } else {
        break;
      }
    }

    return lines.slice(startIdx, endIdx).join("\n").trim();
  }
}
