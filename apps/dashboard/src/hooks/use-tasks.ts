import useSWR from "swr";
import { fetcher } from "@/lib/fetcher";

export function useTasks(boardId?: string) {
  const params = boardId ? `?boardId=${boardId}` : "";
  return useSWR(`/api/tasks${params}`, fetcher);
}
