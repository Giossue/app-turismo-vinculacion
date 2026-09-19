import { useQuery } from "@tanstack/react-query";
import { getPublishedCenter } from "../data/public-centers-api";
import { getStoredOfflineCenter } from "@/features/offline/application/offline-fallback";

export function usePublishedCenter(code: string) {
  return useQuery({
    queryKey: ["public-center", code],
    queryFn: async () => {
      try {
        return await getPublishedCenter(code);
      } catch (error) {
        const cachedCenter = await getStoredOfflineCenter(code);
        if (!cachedCenter) throw error;
        return cachedCenter;
      }
    },
    enabled: Boolean(code),
    gcTime: 24 * 60 * 60 * 1000,
    refetchOnMount: false,
    staleTime: 60_000,
    retry: 1,
  });
}
