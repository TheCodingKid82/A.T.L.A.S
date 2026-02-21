import { prisma } from "@atlas/database";

export class DocumentService {
  async create(data: {
    title: string;
    content: string;
    mimeType?: string;
    tags?: string[];
  }) {
    return prisma.document.create({
      data: {
        title: data.title,
        mimeType: data.mimeType ?? "text/plain",
        content: data.content,
        tags: data.tags ?? [],
        versions: {
          create: {
            version: 1,
            content: data.content,
            changelog: "Initial version",
          },
        },
      },
      include: { versions: true },
    });
  }

  async get(id: string) {
    return prisma.document.findUniqueOrThrow({
      where: { id },
      include: { versions: { orderBy: { version: "desc" } } },
    });
  }

  async update(
    id: string,
    data: { title?: string; content?: string; tags?: string[]; changelog?: string }
  ) {
    const doc = await prisma.document.findUniqueOrThrow({
      where: { id },
      include: { versions: { orderBy: { version: "desc" }, take: 1 } },
    });

    const updateData: Record<string, unknown> = {};
    if (data.title) updateData.title = data.title;
    if (data.tags) updateData.tags = data.tags;

    if (data.content) {
      const nextVersion = (doc.versions[0]?.version ?? 0) + 1;

      updateData.content = data.content;
      updateData.versions = {
        create: {
          version: nextVersion,
          content: data.content,
          changelog: data.changelog ?? `Version ${nextVersion}`,
        },
      };
    }

    return prisma.document.update({
      where: { id },
      data: updateData,
      include: { versions: { orderBy: { version: "desc" } } },
    });
  }

  async list(filters?: { tags?: string[]; mimeType?: string; limit?: number }) {
    return prisma.document.findMany({
      where: {
        ...(filters?.tags?.length ? { tags: { hasSome: filters.tags } } : {}),
        ...(filters?.mimeType ? { mimeType: filters.mimeType } : {}),
      },
      include: { versions: { orderBy: { version: "desc" }, take: 1 } },
      orderBy: { updatedAt: "desc" },
      take: filters?.limit ?? 50,
    });
  }

  async delete(id: string) {
    return prisma.document.delete({ where: { id } });
  }

  async versions(id: string) {
    return prisma.documentVersion.findMany({
      where: { documentId: id },
      orderBy: { version: "desc" },
    });
  }
}
