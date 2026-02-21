import useSWR from "swr";
import { fetcher } from "@/lib/fetcher";

export function useDocuments() {
  return useSWR("/api/documents", fetcher);
}

export function useDocument(id: string | null) {
  return useSWR(id ? `/api/documents/${id}` : null, fetcher);
}
