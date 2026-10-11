import {
  dehydrate,
  type QueryClient,
  type QueryKey,
} from "@tanstack/react-query";
import type { PersistedClient } from "@tanstack/react-query-persist-client";

type QuerySnapshot = ReturnType<typeof dehydrate>["queries"][number];
type PendingQuery = {
  baseline: QuerySnapshot | undefined;
  pending: number;
  failed: boolean;
};
const updates = new WeakMap<QueryClient, Map<string, PendingQuery>>();

/** Conserva la última lectura confirmada mientras se muestran cambios optimistas. */
export function protectOptimisticQuery(
  client: QueryClient,
  queryKey: QueryKey,
): (failed: boolean) => void {
  const cache = client.getQueryCache();
  const query =
    cache.find({ queryKey, exact: true }) ?? cache.build(client, { queryKey });
  const entries = updates.get(client) ?? new Map<string, PendingQuery>();
  updates.set(client, entries);
  const snapshot = () =>
    dehydrate(client, {
      shouldDehydrateMutation: () => false,
      shouldDehydrateQuery: (candidate) =>
        candidate === query && candidate.state.status === "success",
    }).queries[0];
  let entry = entries.get(query.queryHash);
  if (!entry) {
    entry = { baseline: snapshot(), pending: 0, failed: false };
    entries.set(query.queryHash, entry);
    const tracked = entry;
    const unsubscribe = cache.subscribe((event) => {
      if (event.query !== query) return;
      if (event.type === "removed") {
        entries.delete(query.queryHash);
        unsubscribe();
      } else if (
        event.type === "updated" &&
        event.action.type === "success" &&
        !event.action.manual
      ) {
        tracked.baseline = snapshot();
        tracked.failed = false;
        if (tracked.pending === 0) {
          entries.delete(query.queryHash);
          unsubscribe();
        }
      }
    });
    // El éxito de todas las escrituras permite persistir el resultado visible.
    const release = (failed: boolean) => {
      if (entries.get(query.queryHash) !== tracked) return;
      tracked.failed ||= failed;
      tracked.pending--;
      if (tracked.pending === 0 && !tracked.failed) {
        entries.delete(query.queryHash);
        unsubscribe();
      }
    };
    releases.set(tracked, release);
  }
  entry.pending++;
  let completed = false;
  return (failed) => {
    if (completed) return;
    completed = true;
    releases.get(entry)?.(failed);
  };
}

const releases = new WeakMap<PendingQuery, (failed: boolean) => void>();

/** Sustituye antes de encolar: una escritura tardía tampoco guarda una promesa visual. */
export function preserveConfirmedQueries(
  client: QueryClient,
  persisted: PersistedClient,
): PersistedClient {
  const entries = updates.get(client);
  if (!entries?.size) return persisted;
  return {
    ...persisted,
    clientState: {
      ...persisted.clientState,
      queries: persisted.clientState.queries.flatMap((query) => {
        const entry = entries.get(query.queryHash);
        return entry ? (entry.baseline ? [entry.baseline] : []) : [query];
      }),
    },
  };
}
