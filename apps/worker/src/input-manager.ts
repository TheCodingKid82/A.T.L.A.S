import * as pty from "node-pty";
import { WORKER_EXECUTION_TIMEOUT } from "@atlas/shared";

// Kitty keyboard protocol Enter key — the Claude CLI enables \x1b[>1u
// (Kitty protocol) and only recognizes this sequence as "submit prompt".
// Plain \r is treated as newline in the multi-line input.
const KITTY_ENTER = "\x1b[13u";

// ANSI escape sequence regex (from ansi-regex package)
const ANSI_RE =
  // eslint-disable-next-line no-control-regex
  /[\u001B\u009B][[\]()#;?]*(?:(?:(?:(?:;[-a-zA-Z\d\/#&.:=?%@~_]+)*|[a-zA-Z\d]+(?:;[-a-zA-Z\d\/#&.:=?%@~_]*)*)?\u0007)|(?:(?:\d{1,4}(?:;\d{0,4})*)?[\dA-PR-TZcf-nq-uy=><~]))/g;

function stripAnsi(s: string): string {
  return s.replace(ANSI_RE, "");
}

/** Build env without CLAUDECODE and ANTHROPIC_API_KEY. */
function cleanEnv(): Record<string, string> {
  const env: Record<string, string> = {};
  for (const [k, v] of Object.entries(process.env)) {
    if (k !== "CLAUDECODE" && k !== "ANTHROPIC_API_KEY" && v !== undefined) {
      env[k] = v;
    }
  }
  return env;
}

export interface Session {
  id: string;
  pty: pty.IPty;
  buffer: string;
  responseBuffer: string;
  onData: ((chunk: string) => void) | null;
}

let sessionCounter = 0;

export class InputManager {
  private sessions = new Map<string, Session>();

  /**
   * Spawn a new interactive Claude CLI session in a PTY.
   * Waits for the ❯ prompt before returning.
   */
  async spawnSession(opts: {
    cwd: string;
    resume?: string;
    model?: string;
  }): Promise<Session> {
    const args: string[] = ["--dangerously-skip-permissions"];
    if (opts.model) args.push("--model", opts.model);
    if (opts.resume) args.push("--resume", opts.resume);

    console.log(`[InputManager] Spawning: claude ${args.join(" ")} (cwd: ${opts.cwd})`);

    const ptyProcess = pty.spawn("claude", args, {
      name: "xterm-256color",
      cols: 200,
      rows: 50,
      cwd: opts.cwd,
      env: cleanEnv(),
    });

    const id = `session-${++sessionCounter}`;
    const session: Session = {
      id,
      pty: ptyProcess,
      buffer: "",
      responseBuffer: "",
      onData: null,
    };

    ptyProcess.onData((data: string) => {
      session.buffer += data;
      if (session.onData) session.onData(data);
    });

    ptyProcess.onExit(({ exitCode, signal }) => {
      console.log(`[InputManager] Session ${id} exited (code=${exitCode}, signal=${signal})`);
      this.sessions.delete(id);
    });

    this.sessions.set(id, session);

    // Wait for ❯ prompt (CLI ready for input)
    await this.waitForReady(session, 30_000);
    console.log(`[InputManager] Session ${id} ready`);

    // Handle trust prompt if present
    if (stripAnsi(session.buffer).includes("trust")) {
      console.log(`[InputManager] Handling trust prompt...`);
      session.pty.write(KITTY_ENTER);
      // Wait for ready again after trust
      session.buffer = "";
      await this.waitForReady(session, 15_000);
      console.log(`[InputManager] Trust confirmed, session ${id} ready`);
    }

    return session;
  }

  /**
   * Write text to the PTY in chunks to avoid overwhelming the terminal buffer.
   * Large writes can cause data loss or blocking on the PTY.
   */
  private async chunkedWrite(session: Session, text: string): Promise<void> {
    const CHUNK_SIZE = 256;
    const CHUNK_DELAY = 30;
    for (let i = 0; i < text.length; i += CHUNK_SIZE) {
      session.pty.write(text.slice(i, i + CHUNK_SIZE));
      if (i + CHUNK_SIZE < text.length) {
        await new Promise((resolve) => setTimeout(resolve, CHUNK_DELAY));
      }
    }
  }

  /**
   * Send a prompt and collect the response.
   * Uses ⏺ marker to detect response start and quiet period for completion.
   */
  async sendPrompt(
    session: Session,
    prompt: string,
    timeout = WORKER_EXECUTION_TIMEOUT
  ): Promise<{ result: string; sessionId: string | null }> {
    // Write prompt in chunks, then submit
    console.log(`[InputManager] Writing prompt (${prompt.length} chars) to session ${session.id}`);
    await this.chunkedWrite(session, prompt);
    console.log(`[InputManager] Prompt written, sending Kitty Enter in 500ms`);
    await new Promise((resolve) => setTimeout(resolve, 500));
    session.pty.write(KITTY_ENTER);
    console.log(`[InputManager] Kitty Enter sent, waiting for response...`);

    return new Promise((resolve, reject) => {
      session.responseBuffer = "";
      let lastDataTime = Date.now();
      let responseStarted = false;
      let checkTimer: ReturnType<typeof setInterval>;
      let timeoutTimer: ReturnType<typeof setTimeout>;
      let debugTimer: ReturnType<typeof setInterval>;
      const QUIET_MS = 5_000;
      const startTime = Date.now();

      const cleanup = () => {
        session.onData = null;
        clearInterval(checkTimer);
        clearTimeout(timeoutTimer);
        clearInterval(debugTimer);
      };

      session.onData = (data: string) => {
        session.responseBuffer += data;
        lastDataTime = Date.now();

        // Detect response start (⏺ marker)
        if (!responseStarted && data.includes("⏺")) {
          responseStarted = true;
          console.log(`[InputManager] Response started (⏺ detected) after ${Math.round((Date.now() - startTime) / 1000)}s`);
        }
      };

      // Periodic debug logging
      debugTimer = setInterval(() => {
        const elapsed = Math.round((Date.now() - startTime) / 1000);
        const bufLen = session.responseBuffer.length;
        const stripped = stripAnsi(session.responseBuffer);
        const lastChars = stripped.slice(-200).replace(/\r/g, "").replace(/\n/g, " ").trim();
        console.log(`[InputManager] [${elapsed}s] responseStarted=${responseStarted} bufLen=${bufLen} last200="${lastChars}"`);
      }, 15_000);

      // Check for completion: response started + quiet period
      checkTimer = setInterval(() => {
        if (!responseStarted) return;
        const quietMs = Date.now() - lastDataTime;
        if (quietMs >= QUIET_MS) {
          cleanup();
          const result = this.extractResponse(session.responseBuffer);
          console.log(`[InputManager] Response complete after ${Math.round((Date.now() - startTime) / 1000)}s (${result.result.length} chars)`);
          resolve(result);
        }
      }, 500);

      // Overall timeout
      timeoutTimer = setTimeout(() => {
        cleanup();
        const elapsed = Math.round((Date.now() - startTime) / 1000);
        console.warn(`[InputManager] Session ${session.id} timed out after ${elapsed}s`);
        const stripped = stripAnsi(session.responseBuffer);
        console.warn(`[InputManager] Buffer at timeout (${stripped.length} chars): "${stripped.slice(-500).replace(/\r/g, "").trim()}"`);
        if (responseStarted) {
          resolve(this.extractResponse(session.responseBuffer));
        } else {
          resolve({ result: "[Timed out — no response received]", sessionId: null });
        }
      }, timeout);
    });
  }

  /**
   * Send a slash command (e.g., /remote-control).
   * Fire-and-forget: sends command and returns after a delay.
   */
  async sendCommand(session: Session, command: string, waitMs = 10_000): Promise<string> {
    const bufferStart = session.buffer.length;
    await this.chunkedWrite(session, command);
    await new Promise((resolve) => setTimeout(resolve, 200));
    session.pty.write(KITTY_ENTER);
    await new Promise((resolve) => setTimeout(resolve, waitMs));
    return stripAnsi(session.buffer.slice(bufferStart)).replace(/\r/g, "").trim();
  }

  /**
   * Gracefully exit a session and extract the session ID.
   */
  async exitSession(session: Session): Promise<string | null> {
    const bufferStart = session.buffer.length;
    session.pty.write("/exit");
    setTimeout(() => session.pty.write(KITTY_ENTER), 200);

    // Wait for exit and capture session ID
    return new Promise((resolve) => {
      const timer = setTimeout(() => {
        session.pty.kill();
        resolve(null);
      }, 10_000);

      session.pty.onExit(() => {
        clearTimeout(timer);
        const exitOutput = stripAnsi(session.buffer.slice(bufferStart));
        const match = exitOutput.match(/--resume\s+([a-f0-9-]+)/);
        resolve(match ? match[1] : null);
      });
    });
  }

  kill(session: Session): void {
    console.log(`[InputManager] Killing session ${session.id}`);
    try { session.pty.kill(); } catch {}
    this.sessions.delete(session.id);
  }

  killAll(): void {
    for (const session of this.sessions.values()) {
      try { session.pty.kill(); } catch {}
    }
    this.sessions.clear();
  }

  /** Wait for ❯ prompt in stripped buffer. */
  private waitForReady(session: Session, timeout: number): Promise<void> {
    return new Promise((resolve) => {
      let checkTimer: ReturnType<typeof setInterval>;
      let timeoutTimer: ReturnType<typeof setTimeout>;

      const cleanup = () => {
        session.onData = null;
        clearInterval(checkTimer);
        clearTimeout(timeoutTimer);
      };

      session.onData = () => {}; // keep lastDataTime fresh

      checkTimer = setInterval(() => {
        if (stripAnsi(session.buffer).includes("❯")) {
          cleanup();
          resolve();
        }
      }, 300);

      timeoutTimer = setTimeout(() => {
        cleanup();
        console.warn("[InputManager] Ready detection timed out — proceeding");
        resolve();
      }, timeout);
    });
  }

  /**
   * Extract response text from PTY output.
   * Response is marked with ⏺ prefix. Status indicators (✶, ✽, ✳)
   * and UI chrome (────, ❯, bypass permissions) are stripped.
   */
  private extractResponse(rawOutput: string): { result: string; sessionId: string | null } {
    const stripped = stripAnsi(rawOutput);

    // Find ⏺ marker — Claude's response text starts after it
    const markerIdx = stripped.indexOf("⏺");
    if (markerIdx < 0) {
      return { result: stripped.replace(/\r/g, "").trim(), sessionId: null };
    }

    let response = stripped.slice(markerIdx + 1);

    // Remove status indicators that appear inline after response text
    // Patterns: ✶ Word…, ✽ Word…, ✳ Word…, · Word…
    response = response.replace(/[✶✽✳·]\s*\w+…/g, "");

    // Stop at UI chrome
    const stopPatterns = ["────", "bypass permissions", "shift+tab", "(running stop hook)"];
    for (const pat of stopPatterns) {
      const idx = response.indexOf(pat);
      if (idx >= 0) response = response.slice(0, idx);
    }

    // Clean up: normalize whitespace, strip carriage returns
    response = response
      .replace(/\r/g, "")
      .replace(/❯/g, "")
      .split("\n")
      .map((l) => l.trim())
      .filter((l) => l)
      .join("\n")
      .trim();

    // Look for session ID in the full output (from --resume message)
    const sessionMatch = stripped.match(/--resume\s+([a-f0-9-]+)/);

    return { result: response, sessionId: sessionMatch?.[1] ?? null };
  }
}
