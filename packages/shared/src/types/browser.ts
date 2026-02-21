export interface BrowserActionInfo {
  id: string;
  agentId: string;
  action: string;
  url: string | null;
  selector: string | null;
  value: string | null;
  sessionName: string;
  result: unknown;
  createdAt: Date;
}
