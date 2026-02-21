import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { BrowserService } from "@atlas/services";
import { logAudit } from "../middleware/audit-logger.js";

const browserService = new BrowserService();

export function registerBrowserTools(server: McpServer, agentId: string) {
  server.tool(
    "atlas_browser_open",
    "Open a URL in the shared browser",
    { url: z.string().describe("URL to navigate to") },
    async (params) => {
      const start = Date.now();
      const result = await browserService.open(agentId, params.url);
      await logAudit({ agentId, tool: "atlas_browser_open", input: params, duration: Date.now() - start });
      return { content: [{ type: "text" as const, text: JSON.stringify(result, null, 2) }] };
    }
  );

  server.tool(
    "atlas_browser_snapshot",
    "Get an accessibility snapshot of the current page",
    {},
    async () => {
      const start = Date.now();
      const result = await browserService.snapshot(agentId);
      await logAudit({ agentId, tool: "atlas_browser_snapshot", duration: Date.now() - start });
      return { content: [{ type: "text" as const, text: JSON.stringify(result, null, 2) }] };
    }
  );

  server.tool(
    "atlas_browser_click",
    "Click an element on the page",
    { selector: z.string().describe("CSS selector or accessibility ref") },
    async (params) => {
      const start = Date.now();
      const result = await browserService.click(agentId, params.selector);
      await logAudit({ agentId, tool: "atlas_browser_click", input: params, duration: Date.now() - start });
      return { content: [{ type: "text" as const, text: JSON.stringify(result, null, 2) }] };
    }
  );

  server.tool(
    "atlas_browser_fill",
    "Fill a form field with text",
    {
      selector: z.string().describe("CSS selector for the input"),
      value: z.string().describe("Value to type"),
    },
    async (params) => {
      const start = Date.now();
      const result = await browserService.fill(agentId, params.selector, params.value);
      await logAudit({ agentId, tool: "atlas_browser_fill", input: params, duration: Date.now() - start });
      return { content: [{ type: "text" as const, text: JSON.stringify(result, null, 2) }] };
    }
  );

  server.tool(
    "atlas_browser_screenshot",
    "Take a screenshot of the current page",
    {},
    async () => {
      const start = Date.now();
      const result = await browserService.screenshot(agentId);
      await logAudit({ agentId, tool: "atlas_browser_screenshot", duration: Date.now() - start });
      return { content: [{ type: "text" as const, text: JSON.stringify(result, null, 2) }] };
    }
  );

  server.tool(
    "atlas_browser_get_text",
    "Get text content of an element",
    { selector: z.string().describe("CSS selector") },
    async (params) => {
      const start = Date.now();
      const result = await browserService.getText(agentId, params.selector);
      await logAudit({ agentId, tool: "atlas_browser_get_text", input: params, duration: Date.now() - start });
      return { content: [{ type: "text" as const, text: JSON.stringify(result, null, 2) }] };
    }
  );

  server.tool(
    "atlas_browser_execute",
    "Execute JavaScript in the browser",
    { javascript: z.string().describe("JavaScript code to execute") },
    async (params) => {
      const start = Date.now();
      const result = await browserService.execute(agentId, params.javascript);
      await logAudit({ agentId, tool: "atlas_browser_execute", input: params, duration: Date.now() - start });
      return { content: [{ type: "text" as const, text: JSON.stringify(result, null, 2) }] };
    }
  );

  server.tool(
    "atlas_browser_state_save",
    "Save the current browser state (cookies, storage)",
    { name: z.string().describe("State name") },
    async (params) => {
      const start = Date.now();
      const result = await browserService.stateSave(agentId, params.name);
      await logAudit({ agentId, tool: "atlas_browser_state_save", input: params, duration: Date.now() - start });
      return { content: [{ type: "text" as const, text: JSON.stringify(result, null, 2) }] };
    }
  );

  server.tool(
    "atlas_browser_state_load",
    "Load a previously saved browser state",
    { name: z.string().describe("State name to load") },
    async (params) => {
      const start = Date.now();
      const result = await browserService.stateLoad(agentId, params.name);
      await logAudit({ agentId, tool: "atlas_browser_state_load", input: params, duration: Date.now() - start });
      return { content: [{ type: "text" as const, text: JSON.stringify(result, null, 2) }] };
    }
  );
}
