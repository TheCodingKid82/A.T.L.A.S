export interface MemoryEntryInfo {
  id: string;
  supermemoryId: string | null;
  content: string;
  containerTag: string;
  metadata: unknown;
  createdAt: Date;
}
