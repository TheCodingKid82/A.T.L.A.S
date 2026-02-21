import useSWR from "swr";
import { fetcher } from "@/lib/fetcher";

export function useBoards() {
  return useSWR("/api/boards", fetcher);
}

export function useBoard(id: string | null) {
  return useSWR(id ? `/api/boards/${id}` : null, fetcher);
}
