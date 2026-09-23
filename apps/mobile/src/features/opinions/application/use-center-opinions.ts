import {
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient,
  type InfiniteData,
} from "@tanstack/react-query";

import { ApiError } from "@/core/api/http";
import { queryKeys } from "@/core/api/query-keys";
import { useAuth } from "@/features/auth/application/auth-context";
import {
  getNextOpinionOffset,
  mergeOpinionPages,
  OPINIONS_PAGE_SIZE,
  type OpinionContent,
  type OwnOpinionState,
  type PublicOpinionPage,
} from "../domain/opinion";
import {
  createCenterOpinion,
  editCenterOpinion,
  getMyCenterOpinion,
  listCenterOpinions,
} from "../data/opinions-api";

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
  return useQuery({
    queryKey: ownOpinionKey(code, auth.user?.id ?? null),
    queryFn: () => getMyCenterOpinion(code, auth.request),
    enabled: Boolean(code) && enabled && auth.status === "authenticated",
    staleTime: opinionsStaleTimeMs,
  });
}

export function useCenterOpinionMutation() {
  const auth = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ code, content, mode }: OpinionMutation) => {
      if (auth.status !== "authenticated") {
        throw new ApiError("Inicia sesión para publicar una opinión.");
      }
      return mode === "edit"
        ? editCenterOpinion(code, content, auth.request)
        : createCenterOpinion(code, content, auth.request);
    },
    onSuccess: (state, variables) => {
      // The API answers with the new state: no need to fetch it again.
      queryClient.setQueryData<OwnOpinionState | null>(
        ownOpinionKey(variables.code, auth.user?.id ?? null),
        state,
      );
      void queryClient.invalidateQueries({
        queryKey: [...queryKeys.centerOpinions, variables.code],
      });
    },
  });
}

function ownOpinionKey(code: string, userId: number | null) {
  return [...queryKeys.ownOpinion, code, userId ?? "anonymous"];
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

type OpinionMutation = Readonly<{
  code: string;
  content: OpinionContent;
  mode: "create" | "edit";
}>;
