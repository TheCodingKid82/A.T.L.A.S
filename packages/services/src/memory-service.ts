import { prisma } from "@atlas/database";

const SUPERMEMORY_BASE_URL = process.env.SUPERMEMORY_BASE_URL || "https://api.supermemory.com";
const SUPERMEMORY_API_KEY = process.env.SUPERMEMORY_API_KEY;

async function supermemoryFetch(path: string, options: RequestInit = {}) {
  if (!SUPERMEMORY_API_KEY) {
    throw new Error("SUPERMEMORY_API_KEY not configured");
  }

  const res = await fetch(`${SUPERMEMORY_BASE_URL}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${SUPERMEMORY_API_KEY}`,
      ...options.headers,
    },
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Supermemory API error (${res.status}): ${text}`);
  }

  return res.json();
}

export class MemoryService {
  async add(data: { content: string; containerTag?: string; metadata?: Record<string, unknown> }) {
    const containerTag = data.containerTag ?? "atlas-global";

    let supermemoryId: string | null = null;
    try {
      const result = await supermemoryFetch("/v3/memories", {
        method: "POST",
        body: JSON.stringify({
          content: data.content,
          containerTags: [containerTag],
        }),
      });
      supermemoryId = result.id;
    } catch (e) {
      // Store locally even if Supermemory fails
      console.warn("Supermemory add failed, storing locally only:", e);
    }

    return prisma.memoryEntry.create({
      data: {
        supermemoryId,
        content: data.content,
        containerTag,
        metadata: data.metadata as any,
      },
    });
  }

  async search(data: { query: string; containerTag?: string; limit?: number }) {
    try {
      const params = new URLSearchParams({ q: data.query });
      if (data.containerTag) params.set("containerTag", data.containerTag);
      if (data.limit) params.set("limit", String(data.limit));

      const result = await supermemoryFetch(`/v3/memories/search?${params}`);
      return result.results ?? result;
    } catch {
      // Fallback to local search
      return prisma.memoryEntry.findMany({
        where: {
          content: { contains: data.query, mode: "insensitive" },
          ...(data.containerTag ? { containerTag: data.containerTag } : {}),
        },
        take: data.limit ?? 10,
        orderBy: { createdAt: "desc" },
      });
    }
  }

  async get(id: string) {
    return prisma.memoryEntry.findUniqueOrThrow({ where: { id } });
  }

  async delete(id: string) {
    const entry = await prisma.memoryEntry.findUniqueOrThrow({ where: { id } });

    if (entry.supermemoryId) {
      try {
        await supermemoryFetch(`/v3/memories/${entry.supermemoryId}`, {
          method: "DELETE",
        });
      } catch (e) {
        console.warn("Supermemory delete failed:", e);
      }
    }

    return prisma.memoryEntry.delete({ where: { id } });
  }

  async list(filters?: { containerTag?: string; limit?: number }) {
    return prisma.memoryEntry.findMany({
      where: filters?.containerTag ? { containerTag: filters.containerTag } : undefined,
      orderBy: { createdAt: "desc" },
      take: filters?.limit ?? 50,
    });
  }
}
