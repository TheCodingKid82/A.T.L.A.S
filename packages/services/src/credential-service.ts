import { prisma } from "@atlas/database";
import { encrypt, decrypt } from "@atlas/shared";

export class CredentialService {
  async store(data: { name: string; service: string; value: string }) {
    const { encrypted, iv, authTag } = encrypt(data.value);

    return prisma.credential.upsert({
      where: { name: data.name },
      create: {
        name: data.name,
        service: data.service,
        encryptedValue: encrypted,
        iv,
        authTag,
      },
      update: {
        service: data.service,
        encryptedValue: encrypted,
        iv,
        authTag,
      },
      select: { id: true, name: true, service: true, createdAt: true, updatedAt: true },
    });
  }

  async retrieve(name: string): Promise<string> {
    const cred = await prisma.credential.findUniqueOrThrow({
      where: { name },
    });

    return decrypt(cred.encryptedValue, cred.iv, cred.authTag);
  }

  async list() {
    return prisma.credential.findMany({
      select: { id: true, name: true, service: true, createdAt: true, updatedAt: true },
      orderBy: { name: "asc" },
    });
  }

  async delete(name: string) {
    return prisma.credential.delete({
      where: { name },
      select: { id: true, name: true },
    });
  }
}
