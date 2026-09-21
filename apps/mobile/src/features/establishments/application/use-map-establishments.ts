import { useQuery } from "@tanstack/react-query";

import { getMapEstablishments } from "../data/establishments-api";

export function useMapEstablishments() {
  return useQuery({
    queryKey: ["public-establishments-map", "category-markers-v3"],
    queryFn: () => getMapEstablishments(),
    staleTime: 5 * 60 * 1000,
    retry: 1,
  });
}
