import { dehydrate, QueryClient } from "@tanstack/react-query";
import { afterEach, describe, expect, it, vi } from "vitest";
import { queryKeys } from "./query-keys";
import {
  getQueryPersistOptions,
  queryPersistOptions,
  retainQueryAccount,
} from "./query-persistence";
import { protectOptimisticQuery } from "./optimistic-query-persistence";

const storage = vi.hoisted(() => ({
  getItem: vi.fn(async () => null),
  setItem: vi.fn(async (_key: string, _value: string) => undefined),
  removeItem: vi.fn(async () => undefined),
}));
vi.mock("@react-native-async-storage/async-storage", () => ({
  default: storage,
}));

afterEach(() => vi.clearAllMocks());

describe("limpieza de la cuenta en QueryClient", () => {
  it("el proveedor de persistencia escribe la colección confirmada durante un cambio pendiente", async () => {
    const client = new QueryClient();
    const key = [...queryKeys.savedCenters, 7];
    client.setQueryData(key, ["confirmado"]);
    await retainQueryAccount(client, 7);
    const complete = protectOptimisticQuery(client, key);
    client.setQueryData(key, ["confirmado", "tentativo"]);
    const options = getQueryPersistOptions(client);
    const write = options.persister.persistClient({
      buster: options.buster,
      timestamp: Date.now(),
      clientState: dehydrate(client, options.dehydrateOptions),
    });
    await options.persister.flush();
    await write;
    expect(
      JSON.parse(storage.setItem.mock.calls.at(-1)![1]).clientState.queries[0]
        .state.data,
    ).toEqual(["confirmado"]);
    complete(false);
    client.clear();
  });
  it("cancela consultas privadas, retira las cuentas anteriores y conserva el catálogo", async () => {
    const client = new QueryClient();
    const ownKey = [...queryKeys.ownOpinion, "A", 7];
    let signal: AbortSignal | undefined;
    const query = client.fetchQuery({
      queryKey: ownKey,
      queryFn: (context) => {
        signal = context.signal;
        return new Promise(() => undefined);
      },
    });
    const cancelled = query.catch(() => undefined);
    client.setQueryData([...queryKeys.savedCenters, 7], ["otra cuenta"]);
    client.setQueryData(
      [...queryKeys.savedEstablishments, 8],
      ["cuenta actual"],
    );
    client.setQueryData(queryKeys.discoveryCatalog, "catálogo");
    client.getMutationCache().build(client, {
      mutationKey: [...queryKeys.savedCenters, 7, "mutation", 1],
      meta: { accountId: 7 },
    });
    client.getMutationCache().build(client, {
      mutationKey: [...queryKeys.savedCenters, 8, "mutation", 2],
      meta: { accountId: 8 },
    });

    await retainQueryAccount(client, 8);
    await cancelled;
    expect(signal?.aborted).toBe(true);
    expect(client.getQueryData(ownKey)).toBeUndefined();
    expect(client.getQueryData([...queryKeys.savedCenters, 7])).toBeUndefined();
    expect(client.getQueryData([...queryKeys.savedEstablishments, 8])).toEqual([
      "cuenta actual",
    ]);
    expect(client.getQueryData(queryKeys.discoveryCatalog)).toBe("catálogo");
    expect(
      client
        .getMutationCache()
        .getAll()
        .map((mutation) => mutation.options.meta?.accountId),
    ).toEqual([8]);

    await retainQueryAccount(client, null);
    const cached = dehydrate(client, queryPersistOptions.dehydrateOptions);
    expect(cached.queries.map((query) => query.queryKey)).toEqual([
      queryKeys.discoveryCatalog,
    ]);
    expect(cached.mutations).toEqual([]);
    expect(client.getMutationCache().getAll()).toHaveLength(0);
    expect(storage.setItem).toHaveBeenCalled();
    client.clear();
  });
});
