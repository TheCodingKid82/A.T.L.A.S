import { execFile } from "child_process";
import { promisify } from "util";
import { prisma } from "@atlas/database";
import { BROWSER_SESSION_NAME } from "@atlas/shared";

const execFileAsync = promisify(execFile);

async function runBrowserCommand(args: string[]): Promise<string> {
  try {
    const { stdout } = await execFileAsync("agent-browser", args, {
      timeout: 30000,
    });
    return stdout.trim();
  } catch (error: any) {
    throw new Error(`Browser command failed: ${error.message}`);
  }
}

export class BrowserService {
  private sessionName = BROWSER_SESSION_NAME;

  private async logAction(
    agentId: string,
    action: string,
    data: { url?: string; selector?: string; value?: string; result?: unknown }
  ) {
    return prisma.browserAction.create({
      data: {
        agentId,
        action,
        url: data.url,
        selector: data.selector,
        value: data.value,
        sessionName: this.sessionName,
        result: data.result as any,
      },
    });
  }

  async open(agentId: string, url: string) {
    const result = await runBrowserCommand([
      "open",
      url,
      "--session-name",
      this.sessionName,
    ]);
    await this.logAction(agentId, "open", { url, result });
    return { success: true, url, result };
  }

  async snapshot(agentId: string) {
    const result = await runBrowserCommand([
      "snapshot",
      "--session-name",
      this.sessionName,
    ]);
    await this.logAction(agentId, "snapshot", { result });
    return { success: true, snapshot: result };
  }

  async click(agentId: string, selector: string) {
    const result = await runBrowserCommand([
      "click",
      selector,
      "--session-name",
      this.sessionName,
    ]);
    await this.logAction(agentId, "click", { selector, result });
    return { success: true, selector, result };
  }

  async fill(agentId: string, selector: string, value: string) {
    const result = await runBrowserCommand([
      "fill",
      selector,
      value,
      "--session-name",
      this.sessionName,
    ]);
    await this.logAction(agentId, "fill", { selector, value, result });
    return { success: true, selector, result };
  }

  async screenshot(agentId: string) {
    const result = await runBrowserCommand([
      "screenshot",
      "--session-name",
      this.sessionName,
    ]);
    await this.logAction(agentId, "screenshot", { result });
    return { success: true, screenshot: result };
  }

  async getText(agentId: string, selector: string) {
    const result = await runBrowserCommand([
      "get-text",
      selector,
      "--session-name",
      this.sessionName,
    ]);
    await this.logAction(agentId, "get_text", { selector, result });
    return { success: true, text: result };
  }

  async execute(agentId: string, javascript: string) {
    const result = await runBrowserCommand([
      "execute",
      javascript,
      "--session-name",
      this.sessionName,
    ]);
    await this.logAction(agentId, "execute", { value: javascript, result });
    return { success: true, result };
  }

  async stateSave(agentId: string, name: string) {
    const result = await runBrowserCommand([
      "state-save",
      name,
      "--session-name",
      this.sessionName,
    ]);
    await this.logAction(agentId, "state_save", { value: name, result });
    return { success: true, name, result };
  }

  async stateLoad(agentId: string, name: string) {
    const result = await runBrowserCommand([
      "state-load",
      name,
      "--session-name",
      this.sessionName,
    ]);
    await this.logAction(agentId, "state_load", { value: name, result });
    return { success: true, name, result };
  }

  async listActions(agentId?: string, limit = 50) {
    return prisma.browserAction.findMany({
      where: agentId ? { agentId } : undefined,
      include: { agent: true },
      orderBy: { createdAt: "desc" },
      take: limit,
    });
  }
}
