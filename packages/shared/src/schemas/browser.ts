import { z } from "zod";

export const BrowserOpenSchema = z.object({
  url: z.string().url(),
});

export const BrowserClickSchema = z.object({
  selector: z.string(),
});

export const BrowserFillSchema = z.object({
  selector: z.string(),
  value: z.string(),
});

export const BrowserExecuteSchema = z.object({
  javascript: z.string(),
});

export const BrowserGetTextSchema = z.object({
  selector: z.string(),
});

export const BrowserStateSaveSchema = z.object({
  name: z.string().min(1),
});

export const BrowserStateLoadSchema = z.object({
  name: z.string().min(1),
});
