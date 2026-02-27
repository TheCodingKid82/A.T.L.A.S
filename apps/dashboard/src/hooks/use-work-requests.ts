import useSWR from "swr";
import { fetcher } from "@/lib/fetcher";

export function useWorkSessions(status?: string) {
  const params = status ? `?status=${status}` : "";
  return useSWR(`/api/work-requests${params}`, fetcher, {
    refreshInterval: 5000,
  });
}

export function useWorkSession(id: string | null) {
  return useSWR(id ? `/api/work-requests/${id}` : null, fetcher, {
    refreshInterval: 3000,
  });
}
