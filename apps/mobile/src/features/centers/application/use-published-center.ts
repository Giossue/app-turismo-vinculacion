import { useQuery } from "@tanstack/react-query";
import { getPublishedCenter } from "../data/public-centers-api";

export function usePublishedCenter(code: string) {
  return useQuery({
    queryKey: ["public-center", code],
    queryFn: () => getPublishedCenter(code),
    enabled: Boolean(code),
    staleTime: 60_000,
    retry: 1,
  });
}
