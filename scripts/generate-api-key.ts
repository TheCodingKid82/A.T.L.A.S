#!/usr/bin/env tsx
/**
 * Generate a new API key for an A.T.L.A.S. agent
 *
 * Usage: tsx scripts/generate-api-key.ts <slug>
 * Example: tsx scripts/generate-api-key.ts henry
 */

import { randomBytes, createHash } from "crypto";

const slug = process.argv[2];

if (!slug) {
  console.error("Usage: tsx scripts/generate-api-key.ts <slug>");
  console.error("Example: tsx scripts/generate-api-key.ts henry");
  process.exit(1);
}

const random = randomBytes(16).toString("hex");
const key = `atl_${slug}_${random}`;
const hash = createHash("sha256").update(key).digest("hex");

console.log("");
console.log("  Generated API Key");
console.log("  =================");
console.log(`  Slug:   ${slug}`);
console.log(`  Key:    ${key}`);
console.log(`  Hash:   ${hash}`);
console.log(`  Prefix: atl_${slug}_`);
console.log("");
console.log("  Store the hash in the agents table. The key itself is the bearer token.");
console.log("");
