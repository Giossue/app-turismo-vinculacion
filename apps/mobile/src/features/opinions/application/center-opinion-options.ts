import {
  mutationOptions,
  queryOptions,
  type QueryClient,
} from "@tanstack/react-query";

import { queryKeys } from "@/core/api/query-keys";
import { withRequestSignal } from "@/core/api/http";
import { requireCurrentAccount } from "@/features/auth/application/account-session";
import type {
  AccountSessionAccess,
  AccountSessionScope,
} from "@/features/auth/application/mobile-session";
import {
  createCenterOpinion,
  editCenterOpinion,
  getMyCenterOpinion,
} from "../data/opinions-api";
import type { OpinionContent, OwnOpinionState } from "../domain/opinion";
import { messages } from "@/core/i18n/language";

function ownOpinionKey(code: string, userId: number | null) {
  return [...queryKeys.ownOpinion, code, userId ?? "anonymous"];
}

export function getOwnCenterOpinionQueryOptions(
  code: string,
  auth: AccountSessionAccess,
  enabled = true,
) {
  const scope = auth.sessionScope;
  return queryOptions({
    queryKey: ownOpinionKey(code, scope?.userId ?? null),
    queryFn: async ({ signal }) => {
      if (!scope) return null;
      requireCurrentAccount(
        auth,
        scope,
        messages().community.opinions.signInRequired,
      );
      const result = await getMyCenterOpinion(
        code,
        withRequestSignal(auth.request, signal),
      );
      requireCurrentAccount(
        auth,
        scope,
        messages().community.opinions.signInRequired,
      );
      return result;
    },
    enabled: Boolean(code) && enabled && scope !== null,
    staleTime: 30_000,
  });
}

export type OpinionMutation = Readonly<{
  code: string;
  content: OpinionContent;
  mode: "create" | "edit";
}>;
type OpinionMutationContext = Readonly<{
  scope: AccountSessionScope;
  queryKey: ReturnType<typeof ownOpinionKey>;
}>;

export function getCenterOpinionMutationOptions(
  client: QueryClient,
  auth: AccountSessionAccess,
) {
  const scope = auth.sessionScope;
  return mutationOptions<
    OwnOpinionState,
    Error,
    OpinionMutation,
    OpinionMutationContext
  >({
    networkMode: "always",
    mutationKey: [
      ...queryKeys.ownOpinion,
      "mutation",
      scope?.userId ?? "anonymous",
      scope?.generation ?? null,
    ],
    meta: { accountId: scope?.userId, sessionGeneration: scope?.generation },
    onMutate: async (variables) => {
      const currentScope = requireCurrentAccount(
        auth,
        scope,
        messages().community.opinions.signInRequired,
      );
      const queryKey = ownOpinionKey(variables.code, currentScope.userId);
      await client.cancelQueries({ queryKey, exact: true });
      requireCurrentAccount(
        auth,
        currentScope,
        messages().community.opinions.signInRequired,
      );
      return { scope: currentScope, queryKey };
    },
    mutationFn: async ({ code, content, mode }) => {
      requireCurrentAccount(
        auth,
        scope,
        messages().community.opinions.signInRequired,
      );
      const state = await (mode === "edit"
        ? editCenterOpinion(code, content, auth.request)
        : createCenterOpinion(code, content, auth.request));
      requireCurrentAccount(
        auth,
        scope,
        messages().community.opinions.signInRequired,
      );
      return state;
    },
    onSuccess: (state, variables, context) => {
      if (!context || !auth.isCurrentSession(context.scope)) return;
      client.setQueryData<OwnOpinionState | null>(context.queryKey, state);
      return client.invalidateQueries({
        queryKey: [...queryKeys.centerOpinions, variables.code],
      });
    },
  });
}
