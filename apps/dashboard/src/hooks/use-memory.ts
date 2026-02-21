import useSWR from "swr";
import { fetcher } from "@/lib/fetcher";

export function useMemory(containerTag?: string) {
  const params = containerTag ? `?containerTag=${containerTag}` : "";
  return useSWR(`/api/memory${params}`, fetcher);
}
