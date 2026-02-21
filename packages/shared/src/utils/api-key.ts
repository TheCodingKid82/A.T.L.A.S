import { randomBytes, createHash } from "crypto";

export function generateApiKey(slug: string): {
  key: string;
  hash: string;
  prefix: string;
} {
  const random = randomBytes(16).toString("hex");
  const key = `atl_${slug}_${random}`;
  const hash = hashApiKey(key);
  const prefix = `atl_${slug}_`;
  return { key, hash, prefix };
}

export function hashApiKey(key: string): string {
  return createHash("sha256").update(key).digest("hex");
}

export function extractSlugFromKey(key: string): string | null {
  const match = key.match(/^atl_([a-z]+)_/);
  return match ? match[1] : null;
}
