import useSWR from "swr";
import { fetcher } from "@/lib/fetcher";

export function useMcps() {
  return useSWR("/api/mcps", fetcher);
}
