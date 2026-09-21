import { useQuery } from "@tanstack/react-query";

import { getMapEstablishments } from "../data/establishments-api";

export const mapEstablishmentsQueryKey = [
  "public-establishments-map",
  "category-markers-v5",
] as const;

export function useMapEstablishments() {
  return useQuery({
    queryKey: mapEstablishmentsQueryKey,
    queryFn: () => getMapEstablishments(),
    staleTime: 5 * 60 * 1000,
    retry: 1,
  });
}
