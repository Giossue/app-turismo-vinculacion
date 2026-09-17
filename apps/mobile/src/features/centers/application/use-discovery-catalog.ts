import { useQuery } from "@tanstack/react-query";
import { getDiscoveryCatalog } from "../data/public-centers-api";

export function useDiscoveryCatalog() {
  return useQuery({
    queryKey: ["discovery-catalog"],
    queryFn: () => getDiscoveryCatalog(),
    staleTime: 3_600_000,
    retry: 1,
  });
}
