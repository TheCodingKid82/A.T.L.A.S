import useSWR from "swr";
import { fetcher } from "@/lib/fetcher";

export function useBrowserActions() {
  return useSWR("/api/browser", fetcher);
}
