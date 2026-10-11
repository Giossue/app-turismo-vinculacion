import {
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient,
  type InfiniteData,
} from "@tanstack/react-query";

import { queryKeys } from "@/core/api/query-keys";
import { useAuth } from "@/features/auth/application/auth-context";
import {
  getNextOpinionOffset,
  mergeOpinionPages,
  OPINIONS_PAGE_SIZE,
  type PublicOpinionPage,
} from "../domain/opinion";
import { listCenterOpinions } from "../data/opinions-api";
import {
  getCenterOpinionMutationOptions,
  getOwnCenterOpinionQueryOptions,
} from "./center-opinion-options";

// Short enough to show new approvals when a place is reopened, long enough
// that the map sheet and the opinions tab share one request.
const opinionsStaleTimeMs = 30_000;

/**
 * Published opinions of a place. `data` has the shape of a single page with
 * every loaded opinion and the latest summary; `fetchNextPage` loads more.
 */
export function useCenterOpinions(code: string, enabled = true) {
  return useInfiniteQuery({
    queryKey: [...queryKeys.centerOpinions, code],
    queryFn: ({ pageParam, signal }) =>
      listCenterOpinions(
        code,
        { limit: OPINIONS_PAGE_SIZE, offset: pageParam },
        { signal },
      ),
    initialPageParam: 0,
    getNextPageParam: getNextOpinionOffset,
    select: selectOpinionPages,
    enabled: Boolean(code) && enabled,
    staleTime: opinionsStaleTimeMs,
  });
}

export function useOwnCenterOpinion(code: string, enabled = true) {
  const auth = useAuth();
  return useQuery(getOwnCenterOpinionQueryOptions(code, auth, enabled));
}

export function useCenterOpinionMutation() {
  const auth = useAuth();
  const queryClient = useQueryClient();

  return useMutation(getCenterOpinionMutationOptions(queryClient, auth));
}

function selectOpinionPages(
  data: InfiniteData<PublicOpinionPage, number>,
): PublicOpinionPage {
  const [first, ...rest] = data.pages;
  return first ? mergeOpinionPages([first, ...rest]) : emptyOpinionPage;
}

const emptyOpinionPage: PublicOpinionPage = {
  items: [],
  limit: OPINIONS_PAGE_SIZE,
  offset: 0,
  summary: {
    averageRating: null,
    distribution: { "1": 0, "2": 0, "3": 0, "4": 0, "5": 0 },
    total: 0,
    totalRatings: 0,
  },
  total: 0,
};
