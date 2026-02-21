export interface DocumentInfo {
  id: string;
  title: string;
  mimeType: string;
  content: string;
  tags: string[];
  createdAt: Date;
  updatedAt: Date;
}

export interface DocumentVersionInfo {
  id: string;
  documentId: string;
  version: number;
  content: string;
  changelog: string | null;
  createdAt: Date;
}
