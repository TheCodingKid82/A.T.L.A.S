import { z } from "zod";

export const CredentialCreateSchema = z.object({
  name: z.string().min(1),
  service: z.string().min(1),
  value: z.string().min(1),
});

export const CredentialGetSchema = z.object({
  name: z.string().min(1),
});
