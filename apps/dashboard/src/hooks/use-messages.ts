import useSWR from "swr";
import { fetcher } from "@/lib/fetcher";

export function useChannels() {
  return useSWR("/api/channels", fetcher);
}

export function useMessages(channelId: string | null) {
  return useSWR(channelId ? `/api/messages?channelId=${channelId}` : null, fetcher);
}
