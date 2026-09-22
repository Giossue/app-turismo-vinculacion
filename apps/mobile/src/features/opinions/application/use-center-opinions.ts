import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { queryKeys } from "@/core/api/query-keys";
import { useAuth } from "@/features/auth/application/auth-context";
import type { OpinionContent } from "../domain/opinion";
import {
  createCenterOpinion,
  editCenterOpinion,
  getMyCenterOpinion,
  listCenterOpinions,
} from "../data/opinions-api";

export function useCenterOpinions(code: string, enabled = true) {
  return useQuery({
    queryKey: [...queryKeys.centerOpinions, code],
    queryFn: () => listCenterOpinions(code),
    enabled: Boolean(code) && enabled,
    refetchOnMount: "always",
    staleTime: 0,
  });
}

export function useOwnCenterOpinion(code: string, enabled = true) {
  const auth = useAuth();
  const userId = auth.user?.id ?? null;
  return useQuery({
    queryKey: [...queryKeys.ownOpinion, code, userId ?? "anonymous"],
    queryFn: () => getMyCenterOpinion(code, auth.request),
    enabled: Boolean(code) && enabled && auth.status === "authenticated",
    refetchOnMount: "always",
    staleTime: 0,
  });
}

export function useCenterOpinionMutation() {
  const auth = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ code, content, mode }: OpinionMutation) => {
      if (auth.status !== "authenticated") {
        throw new Error("Inicia sesión para publicar una opinión.");
      }
      return mode === "edit"
        ? editCenterOpinion(code, content, auth.request)
        : createCenterOpinion(code, content, auth.request);
    },
    onSuccess: (_state, variables) => {
      void queryClient.invalidateQueries({
        queryKey: [...queryKeys.centerOpinions, variables.code],
      });
      void queryClient.invalidateQueries({
        queryKey: [...queryKeys.ownOpinion, variables.code],
      });
    },
  });
}

type OpinionMutation = Readonly<{
  code: string;
  content: OpinionContent;
  mode: "create" | "edit";
}>;
