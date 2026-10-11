import type {
  PersistedClient,
  Persister,
} from "@tanstack/react-query-persist-client";
import { z } from "zod";

import { createSerialTaskQueue } from "@/core/storage/serial-task-queue";
import {
  getQueryAccountId,
  isPersistedQueryKey,
  isUserScopedQueryKey,
  ONE_DAY_MS,
} from "./query-keys";

type Storage = Readonly<{
  getItem: (key: string) => Promise<string | null>;
  setItem: (key: string, value: string) => Promise<unknown>;
  removeItem: (key: string) => Promise<unknown>;
}>;

const snapshotSchema = z.object({
  buster: z.string(),
  timestamp: z.number().finite(),
  clientState: z.object({ queries: z.array(z.unknown()) }),
});
const querySchema = z
  .object({
    queryKey: z.array(z.unknown()),
    queryHash: z.string(),
    state: z
      .object({
        status: z.literal("success"),
        dataUpdatedAt: z.number().finite(),
      })
      .passthrough(),
  })
  .passthrough();

export function canPersistQuery(
  queryKey: readonly unknown[],
  updatedAt: number,
  accountId: number | null | undefined,
  now = Date.now(),
): boolean {
  if (
    !isPersistedQueryKey(queryKey) ||
    updatedAt <= 0 ||
    updatedAt > now ||
    now - updatedAt > ONE_DAY_MS
  ) {
    return false;
  }
  if (!isUserScopedQueryKey(queryKey)) return true;
  const owner = getQueryAccountId(queryKey);
  return owner !== null && (accountId === undefined || owner === accountId);
}

/** La edad del snapshot no prolonga la vida de cada entrada ni guarda mutaciones. */
export function filterPersistedClient(
  value: unknown,
  accountId?: number | null,
  now = Date.now(),
): PersistedClient | undefined {
  const parsed = snapshotSchema.safeParse(value);
  if (!parsed.success) return undefined;
  const queries = parsed.data.clientState.queries.filter((value) => {
    const query = querySchema.safeParse(value);
    return (
      query.success &&
      canPersistQuery(
        query.data.queryKey,
        query.data.state.dataUpdatedAt,
        accountId,
        now,
      )
    );
  });
  return {
    buster: parsed.data.buster,
    timestamp: parsed.data.timestamp,
    clientState: { queries, mutations: [] },
  } as PersistedClient;
}

/** Una eliminación cancela lo pendiente y queda detrás de las escrituras en curso. */
export function createQueryCachePersister({
  storage,
  key,
  filter = filterPersistedClient,
  throttleTime = 1_000,
}: Readonly<{
  storage: Storage;
  key: string;
  filter?: (client: unknown) => PersistedClient | undefined;
  throttleTime?: number;
}>): Persister & { flush: () => Promise<void> } {
  const queue = createSerialTaskQueue();
  let generation = 0;
  let timer: ReturnType<typeof setTimeout> | undefined;
  let pending:
    | {
        client: PersistedClient;
        generation: number;
        complete: (() => void)[];
      }
    | undefined;

  const cancelPending = () => {
    clearTimeout(timer);
    timer = undefined;
    pending?.complete.forEach((complete) => complete());
    pending = undefined;
  };

  const flush = async () => {
    clearTimeout(timer);
    timer = undefined;
    const write = pending;
    pending = undefined;
    if (!write) return;
    try {
      await queue.run(async () => {
        if (write.generation !== generation) return;
        const client = filter(write.client);
        if (client) await storage.setItem(key, JSON.stringify(client));
      });
    } catch {
      // Persistir consultas es de mejor esfuerzo; borrar sí propaga errores.
    } finally {
      write.complete.forEach((complete) => complete());
    }
  };

  return {
    persistClient: (client) =>
      new Promise<void>((complete) => {
        if (pending) {
          pending.client = client;
          pending.complete.push(complete);
        } else {
          pending = { client, generation, complete: [complete] };
          timer = setTimeout(() => void flush(), throttleTime);
        }
      }),
    restoreClient: async () => {
      const expected = generation;
      const value = await queue.run(() => storage.getItem(key));
      if (expected !== generation || !value) return undefined;
      return filter(JSON.parse(value));
    },
    removeClient: () => {
      generation++;
      cancelPending();
      return queue.run(async () => {
        await storage.removeItem(key);
      });
    },
    flush,
  };
}
