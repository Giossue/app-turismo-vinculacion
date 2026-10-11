import {
  dehydrate,
  MutationObserver,
  QueryClient,
} from "@tanstack/react-query";
import type { PersistedClient } from "@tanstack/react-query-persist-client";
import { describe, expect, it, vi } from "vitest";

import type { AccountSessionAccess } from "@/features/auth/application/mobile-session";
import { getSavedCollectionMutationOptions } from "@/features/favorites/application/saved-collection-options";
import {
  createQueryCachePersister,
  filterPersistedClient,
} from "./query-cache-persister";
import { queryKeys, ONE_DAY_MS } from "./query-keys";
import {
  preserveConfirmedQueries,
  protectOptimisticQuery,
} from "./optimistic-query-persistence";

const key = [...queryKeys.savedCenters, 7];
function deferred() {
  let resolve!: () => void;
  let reject!: (error: Error) => void;
  const promise = new Promise<void>((complete, fail) => {
    resolve = complete;
    reject = fail;
  });
  return { promise, resolve, reject };
}

function harness(previous?: readonly string[]) {
  const client = new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: Infinity },
      mutations: { gcTime: Infinity },
    },
  });
  if (previous) client.setQueryData(key, previous);
  const auth: AccountSessionAccess = {
    request: vi.fn(),
    sessionScope: { userId: 7, generation: 1 },
    isCurrentSession: () => true,
  };
  const save = vi.fn(async (_item: string): Promise<void> => undefined);
  const mutation = new MutationObserver(
    client,
    getSavedCollectionMutationOptions(
      client,
      queryKeys.savedCenters,
      {
        apply: (list: readonly string[], item: string, saved: boolean) =>
          saved ? list.filter((value) => value !== item) : [...list, item],
        getItem: (variables: { item: string; currentlySaved: boolean }) =>
          variables.item,
        remove: vi.fn(async () => undefined),
        save,
      },
      auth,
    ),
  );
  return { client, mutation, save };
}

function snapshot(client: QueryClient): PersistedClient {
  return preserveConfirmedQueries(client, {
    buster: "mobile-v3",
    timestamp: Date.now(),
    clientState: dehydrate(client),
  });
}

describe("persistencia de favoritos confirmados", () => {
  it("mantiene el cambio pendiente en pantalla y la colección confirmada en disco", async () => {
    const test = harness(["anterior"]);
    const gate = deferred();
    test.save.mockReturnValueOnce(gate.promise);
    const operation = test.mutation.mutate({
      item: "nuevo",
      currentlySaved: false,
    });
    await vi.waitFor(() => expect(test.save).toHaveBeenCalledOnce());
    const before = test.client.getQueryData(key);
    const captured = snapshot(test.client);
    expect(before).toEqual(["anterior", "nuevo"]);
    expect(captured.clientState.queries[0]?.state.data).toEqual(["anterior"]);
    const storage = {
      getItem: vi.fn(),
      removeItem: vi.fn(),
      setItem: vi.fn(async (_key: string, _value: string) => undefined),
    };
    const persister = createQueryCachePersister({ key: "cache", storage });
    const write = persister.persistClient(captured);
    gate.resolve();
    await operation;
    await persister.flush();
    await write;
    expect(
      JSON.parse(storage.setItem.mock.calls[0]![1]).clientState.queries[0].state
        .data,
    ).toEqual(["anterior"]);
    expect(snapshot(test.client).clientState.queries[0]?.state.data).toEqual([
      "anterior",
      "nuevo",
    ]);
    test.client.clear();
  });

  it("no inventa una colección offline cuando aún no había una copia confirmada", async () => {
    const test = harness();
    const gate = deferred();
    test.save.mockReturnValueOnce(gate.promise);
    const operation = test.mutation.mutate({
      item: "nuevo",
      currentlySaved: false,
    });
    const rejected = expect(operation).rejects.toThrow("rechazado");
    await vi.waitFor(() => expect(test.save).toHaveBeenCalledOnce());
    expect(snapshot(test.client).clientState.queries).toEqual([]);
    gate.reject(new Error("rechazado"));
    await rejected;
    expect(snapshot(test.client).clientState.queries).toEqual([]);
    test.client.clear();
  });

  it("no persiste un cambio concurrente rechazado si la revalidación todavía no pudo confirmar la colección", async () => {
    const test = harness([]);
    const first = deferred();
    const second = deferred();
    test.save
      .mockReturnValueOnce(first.promise)
      .mockReturnValueOnce(second.promise);
    const a = test.mutation.mutate({ item: "A", currentlySaved: false });
    const rejected = expect(a).rejects.toThrow("rechazado");
    await vi.waitFor(() => expect(test.save).toHaveBeenCalledTimes(1));
    const b = test.mutation.mutate({ item: "B", currentlySaved: false });
    await vi.waitFor(() => expect(test.save).toHaveBeenCalledTimes(2));
    expect(snapshot(test.client).clientState.queries[0]?.state.data).toEqual(
      [],
    );
    first.reject(new Error("rechazado"));
    await rejected;
    second.resolve();
    await b;
    expect(snapshot(test.client).clientState.queries[0]?.state.data).toEqual(
      [],
    );
    await test.client.fetchQuery({ queryKey: key, queryFn: async () => ["B"] });
    expect(snapshot(test.client).clientState.queries[0]?.state.data).toEqual([
      "B",
    ]);
    test.client.clear();
  });

  it("acepta una lectura confirmada aunque TanStack reutilice la referencia optimista", async () => {
    const test = harness(["anterior"]);
    const complete = protectOptimisticQuery(test.client, key);
    test.client.setQueryData(key, ["anterior", "nuevo"]);
    complete(true);
    const optimistic = test.client.getQueryData(key);
    await test.client.fetchQuery({
      queryKey: key,
      queryFn: async () => ["anterior", "nuevo"],
    });
    expect(test.client.getQueryData(key)).toBe(optimistic);
    expect(snapshot(test.client).clientState.queries[0]?.state.data).toEqual([
      "anterior",
      "nuevo",
    ]);
    test.client.clear();
  });

  it("una limpieza antigua no libera la protección de la consulta recreada", () => {
    const test = harness(["anterior"]);
    const old = protectOptimisticQuery(test.client, key);
    test.client.removeQueries({ queryKey: key, exact: true });
    test.client.setQueryData(key, ["nueva sesión"]);
    const current = protectOptimisticQuery(test.client, key);
    test.client.setQueryData(key, ["tentativo"]);
    old(false);
    expect(snapshot(test.client).clientState.queries[0]?.state.data).toEqual([
      "nueva sesión",
    ]);
    current(false);
    test.client.clear();
  });

  it("un cambio visual no renueva las 24 horas de la copia confirmada", () => {
    const test = harness();
    test.client.setQueryData(key, ["vencido"], {
      updatedAt: Date.now() - ONE_DAY_MS - 1,
    });
    const complete = protectOptimisticQuery(test.client, key);
    test.client.setQueryData(key, ["vencido", "pendiente"]);
    expect(
      filterPersistedClient(snapshot(test.client), 7)?.clientState.queries,
    ).toEqual([]);
    complete(true);
    test.client.clear();
  });
});
