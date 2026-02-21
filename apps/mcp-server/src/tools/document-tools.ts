import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { DocumentService } from "@atlas/services";
import { logAudit } from "../middleware/audit-logger.js";

const documentService = new DocumentService();

export function registerDocumentTools(server: McpServer, agentId: string) {
  server.tool(
    "atlas_document_create",
    "Create a new document",
    {
      title: z.string().describe("Document title"),
      content: z.string().describe("Document content"),
      mimeType: z.string().default("text/plain").describe("MIME type"),
      tags: z.array(z.string()).default([]).describe("Document tags"),
    },
    async (params) => {
      const start = Date.now();
      const doc = await documentService.create(params);
      await logAudit({ agentId, tool: "atlas_document_create", input: { title: params.title }, output: { id: doc.id }, duration: Date.now() - start });
      return { content: [{ type: "text" as const, text: JSON.stringify(doc, null, 2) }] };
    }
  );

  server.tool(
    "atlas_document_get",
    "Get a document by ID with its content",
    { id: z.string().describe("Document ID") },
    async (params) => {
      const start = Date.now();
      const doc = await documentService.get(params.id);
      await logAudit({ agentId, tool: "atlas_document_get", input: params, duration: Date.now() - start });
      return { content: [{ type: "text" as const, text: JSON.stringify(doc, null, 2) }] };
    }
  );

  server.tool(
    "atlas_document_update",
    "Update a document (creates new version if content changes)",
    {
      id: z.string().describe("Document ID"),
      title: z.string().optional().describe("New title"),
      content: z.string().optional().describe("New content (creates version)"),
      tags: z.array(z.string()).optional().describe("New tags"),
      changelog: z.string().optional().describe("Version changelog"),
    },
    async (params) => {
      const start = Date.now();
      const doc = await documentService.update(params.id, params);
      await logAudit({ agentId, tool: "atlas_document_update", input: { id: params.id }, output: { id: doc.id }, duration: Date.now() - start });
      return { content: [{ type: "text" as const, text: JSON.stringify(doc, null, 2) }] };
    }
  );

  server.tool(
    "atlas_document_list",
    "List documents with optional filters",
    {
      tags: z.array(z.string()).optional().describe("Filter by tags"),
      mimeType: z.string().optional().describe("Filter by MIME type"),
      limit: z.number().default(50).describe("Max results"),
    },
    async (params) => {
      const start = Date.now();
      const docs = await documentService.list(params);
      await logAudit({ agentId, tool: "atlas_document_list", input: params, output: { count: docs.length }, duration: Date.now() - start });
      return { content: [{ type: "text" as const, text: JSON.stringify(docs, null, 2) }] };
    }
  );

  server.tool(
    "atlas_document_delete",
    "Delete a document",
    { id: z.string().describe("Document ID to delete") },
    async (params) => {
      const start = Date.now();
      await documentService.delete(params.id);
      await logAudit({ agentId, tool: "atlas_document_delete", input: params, duration: Date.now() - start });
      return { content: [{ type: "text" as const, text: JSON.stringify({ deleted: true, id: params.id }) }] };
    }
  );

  server.tool(
    "atlas_document_versions",
    "List version history for a document",
    { id: z.string().describe("Document ID") },
    async (params) => {
      const start = Date.now();
      const versions = await documentService.versions(params.id);
      await logAudit({ agentId, tool: "atlas_document_versions", input: params, output: { count: versions.length }, duration: Date.now() - start });
      return { content: [{ type: "text" as const, text: JSON.stringify(versions, null, 2) }] };
    }
  );
}
