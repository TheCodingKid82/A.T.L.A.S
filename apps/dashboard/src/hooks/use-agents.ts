import useSWR from "swr";
import { fetcher } from "@/lib/fetcher";

export function useAgents() {
  return useSWR("/api/agents", fetcher);
}

export function useAgent(id: string | null) {
  return useSWR(id ? `/api/agents/${id}` : null, fetcher);
}
