import { dehydrate, QueryClient } from "@tanstack/react-query";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  createQueryCachePersister,
  filterPersistedClient,
} from "./query-cache-persister";
import { ONE_DAY_MS, queryKeys } from "./query-keys";

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((complete) => {
    resolve = complete;
  });
  return { promise, resolve };
}

function snapshot() {
  const client = new QueryClient({
    defaultOptions: { queries: { gcTime: Infinity } },
  });
  client.setQueryData([...queryKeys.publishedCenter, "A"], "público");
  client.setQueryData([...queryKeys.savedCenters, 7], ["privado"]);
  const result = {
    timestamp: Date.now(),
    buster: "mobile-v4",
    clientState: dehydrate(client),
  };
  client.clear();
  return result;
}

function storageHarness() {
  let disk: string | null = null;
  return {
    storage: {
      getItem: vi.fn(async () => disk),
      setItem: vi.fn(async (_key: string, value: string) => {
        disk = value;
      }),
      removeItem: vi.fn(async () => {
        disk = null;
      }),
    },
    read: () => disk,
  };
}

beforeEach(() => vi.useFakeTimers());
afterEach(() => vi.useRealTimers());

describe("persistencia cancelable de consultas", () => {
  it("cancela una escritura pendiente al borrar sin que reaparezca", async () => {
    const disk = storageHarness();
    const persister = createQueryCachePersister({
      storage: disk.storage,
      key: "cache",
    });
    const write = persister.persistClient(snapshot());
    await persister.removeClient();
    await vi.advanceTimersByTimeAsync(2_000);
    await write;
    expect(disk.storage.setItem).not.toHaveBeenCalled();
    expect(disk.read()).toBeNull();
  });

  it("espera una escritura en curso antes de borrar y permite guardar datos públicos después", async () => {
    const disk = storageHarness();
    const gate = deferred<void>();
    disk.storage.setItem.mockImplementationOnce(async (_key, value) => {
      await gate.promise;
      await disk.storage.setItem(_key, value);
    });
    const persister = createQueryCachePersister({
      storage: disk.storage,
      key: "cache",
    });
    const write = persister.persistClient(snapshot());
    const flush = persister.flush();
    await Promise.resolve();
    const removal = persister.removeClient();
    expect(disk.storage.removeItem).not.toHaveBeenCalled();
    gate.resolve();
    await Promise.all([write, flush, removal]);
    expect(disk.read()).toBeNull();

    const publicOnly = filterPersistedClient(snapshot(), null)!;
    const publicWrite = persister.persistClient(publicOnly);
    await persister.flush();
    await publicWrite;
    expect(JSON.parse(disk.read()!).clientState.queries).toHaveLength(1);
    expect(disk.read()).not.toContain("privado");
  });

  it("descarta una restauración que termina después del borrado", async () => {
    const disk = storageHarness();
    const read = deferred<string | null>();
    disk.storage.getItem.mockReturnValueOnce(read.promise);
    const persister = createQueryCachePersister({
      storage: disk.storage,
      key: "cache",
    });
    const restoring = persister.restoreClient();
    const removal = persister.removeClient();
    read.resolve(JSON.stringify(snapshot()));
    expect(await restoring).toBeUndefined();
    await removal;
  });

  it("propaga el fallo del borrado sin bloquear posteriores operaciones", async () => {
    const disk = storageHarness();
    disk.storage.removeItem.mockRejectedValueOnce(new Error("Almacén cerrado"));
    const persister = createQueryCachePersister({
      storage: disk.storage,
      key: "cache",
    });
    await expect(persister.removeClient()).rejects.toThrow("Almacén cerrado");
    const write = persister.persistClient(snapshot());
    await persister.flush();
    await write;
    expect(disk.read()).not.toBeNull();
  });

  it("agrupa cambios rápidos y escribe solo el snapshot más reciente", async () => {
    const disk = storageHarness();
    const persister = createQueryCachePersister({
      storage: disk.storage,
      key: "cache",
    });
    const first = persister.persistClient(snapshot());
    const second = persister.persistClient(
      filterPersistedClient(snapshot(), null)!,
    );
    await vi.advanceTimersByTimeAsync(1_000);
    await Promise.all([first, second]);
    expect(disk.storage.setItem).toHaveBeenCalledOnce();
    expect(disk.read()).not.toContain("privado");
  });
});

describe("política de restauración", () => {
  it("descarta datos viejos aunque el snapshot sea reciente, claves no permitidas y mutaciones", () => {
    const client = new QueryClient({
      defaultOptions: { queries: { gcTime: Infinity } },
    });
    client.setQueryData(queryKeys.discoveryCatalog, "viejo", {
      updatedAt: Date.now() - ONE_DAY_MS - 1,
    });
    client.setQueryData([...queryKeys.publicSearch, "búsqueda"], "texto");
    client.setQueryData([...queryKeys.publishedMapCenters, "bbox"], "GPS");
    client.setQueryData([...queryKeys.savedCenters, "anonymous"], "privado");
    client.setQueryData(["saved-centers", "account-v1", 7], "versión vieja");
    client.setQueryData(queryKeys.offlineCities, "vigente");
    const value = {
      ...snapshot(),
      clientState: {
        ...dehydrate(client),
        mutations: [{ state: { isPaused: true, variables: "privado" } }],
      },
    };
    const filtered = filterPersistedClient(value);
    expect(
      filtered?.clientState.queries.map((query) => query.queryKey),
    ).toEqual([queryKeys.offlineCities]);
    expect(filtered?.clientState.mutations).toEqual([]);
    client.clear();
  });

  it("restaura guardados solo para su propietario conocido", () => {
    const value = snapshot();
    expect(filterPersistedClient(value, 7)?.clientState.queries).toHaveLength(
      2,
    );
    expect(filterPersistedClient(value, 8)?.clientState.queries).toHaveLength(
      1,
    );
    expect(
      filterPersistedClient(value, null)?.clientState.queries,
    ).toHaveLength(1);
  });

  it("rechaza snapshots rotos y entradas incompletas sin hidratar errores", () => {
    expect(filterPersistedClient({ timestamp: 1 })).toBeUndefined();
    const value = snapshot();
    value.clientState.queries[0].state.status = "error";
    value.clientState.queries.push(null as never);
    expect(filterPersistedClient(value)?.clientState.queries).toHaveLength(1);
  });
});
