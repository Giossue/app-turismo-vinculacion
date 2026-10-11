import {
  MutationObserver,
  onlineManager,
  QueryClient,
  QueryObserver,
} from "@tanstack/react-query";
import { afterEach, describe, expect, it, vi } from "vitest";

import { queryKeys } from "@/core/api/query-keys";
import type {
  AccountSessionAccess,
  AccountSessionScope,
} from "@/features/auth/application/mobile-session";
import type { AuthorizedFetcher } from "@/features/auth/data/auth-api";
import {
  getCenterOpinionMutationOptions,
  getOwnCenterOpinionQueryOptions,
} from "@/features/opinions/application/center-opinion-options";
import {
  getSavedCollectionMutationOptions,
  getSavedCollectionQueryOptions,
} from "./saved-collection-options";

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason: Error) => void;
  const promise = new Promise<T>((complete, fail) => {
    resolve = complete;
    reject = fail;
  });
  return { promise, resolve, reject };
}

function harness() {
  const client = new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: Infinity },
      mutations: { gcTime: Infinity },
    },
  });
  let current: AccountSessionScope | null = { generation: 1, userId: 7 };
  const request = vi.fn<AuthorizedFetcher>(async () =>
    Response.json({ data: null }),
  );
  const auth = (): AccountSessionAccess => ({
    request,
    sessionScope: current,
    isCurrentSession: (scope) =>
      scope !== null &&
      scope.userId === current?.userId &&
      scope.generation === current.generation,
  });
  const changeAccount = (userId: number | null) => {
    current =
      userId === null
        ? null
        : { generation: (current?.generation ?? 1) + 1, userId };
    client.removeQueries({
      predicate: (query) =>
        query.queryKey[0] === "saved-centers" ||
        query.queryKey[0] === "own-center-opinion",
    });
  };
  const operations = {
    apply: (list: readonly string[], item: string, saved: boolean) =>
      saved ? list.filter((value) => value !== item) : [...list, item],
    getItem: (variables: { item: string; currentlySaved: boolean }) =>
      variables.item,
    remove: vi.fn(
      async (_item: string, _request: AuthorizedFetcher): Promise<void> =>
        undefined,
    ),
    save: vi.fn(
      async (_item: string, _request: AuthorizedFetcher): Promise<void> =>
        undefined,
    ),
  };
  const options = () =>
    getSavedCollectionMutationOptions(
      client,
      queryKeys.savedCenters,
      operations,
      auth(),
    );
  return { client, auth, changeAccount, request, operations, options };
}

afterEach(() => {
  vi.unstubAllEnvs();
  onlineManager.setOnline(true);
});

describe("consultas privadas de la cuenta", () => {
  it("informa el fallo y revierte un guardado sin red en lugar de dejarlo en cola", async () => {
    onlineManager.setOnline(false);
    const test = harness();
    const key = [...queryKeys.savedCenters, 7];
    test.client.setQueryData(key, ["anterior"]);
    test.operations.save.mockRejectedValueOnce(new Error("sin conexión"));
    const observer = new MutationObserver(test.client, test.options());
    await expect(
      observer.mutate({ item: "nuevo", currentlySaved: false }),
    ).rejects.toThrow("sin conexión");
    expect(test.client.getQueryData(key)).toEqual(["anterior"]);
    expect(observer.getCurrentResult().isPaused).toBe(false);
    test.client.clear();
  });

  it("no deja una opinión esperando a la próxima conexión", async () => {
    vi.stubEnv("EXPO_PUBLIC_API_URL", "https://api.test/api/v1");
    onlineManager.setOnline(false);
    const test = harness();
    test.request.mockRejectedValueOnce(new TypeError("sin red"));
    const observer = new MutationObserver(
      test.client,
      getCenterOpinionMutationOptions(test.client, test.auth()),
    );
    await expect(
      observer.mutate({
        code: "A",
        content: { rating: 5, comment: "Visita" },
        mode: "create",
      }),
    ).rejects.toThrow();
    expect(test.request).toHaveBeenCalledOnce();
    expect(observer.getCurrentResult().isPaused).toBe(false);
    test.client.clear();
  });
  it("no consulta ni expone colecciones u opiniones para un invitado", async () => {
    const test = harness();
    test.changeAccount(null);
    const list = vi.fn(async () => ["privado"]);
    const saved = new QueryObserver(
      test.client,
      getSavedCollectionQueryOptions(queryKeys.savedCenters, list, test.auth()),
    );
    const own = new QueryObserver(
      test.client,
      getOwnCenterOpinionQueryOptions("A", test.auth()),
    );
    const unsubscribeSaved = saved.subscribe(() => undefined);
    const unsubscribeOwn = own.subscribe(() => undefined);
    await Promise.resolve();
    expect(list).not.toHaveBeenCalled();
    expect(test.request).not.toHaveBeenCalled();
    expect(saved.getCurrentResult().data).toBeUndefined();
    unsubscribeSaved();
    unsubscribeOwn();
    test.client.clear();
  });

  it("transmite el AbortSignal y descarta una lectura de guardados al salir", async () => {
    const test = harness();
    const gate = deferred<Response>();
    test.request.mockReturnValueOnce(gate.promise);
    const list = async (request: AuthorizedFetcher) => {
      await request("https://api.test/favorites");
      return ["privado"];
    };
    const options = getSavedCollectionQueryOptions(
      queryKeys.savedCenters,
      list,
      test.auth(),
    );
    const reading = test.client.fetchQuery(options);
    const discarded = expect(reading).rejects.toBeDefined();
    const signal = test.request.mock.calls[0][1]?.signal;
    test.changeAccount(null);
    expect(signal?.aborted).toBe(true);
    gate.resolve(Response.json({ data: [] }));
    await discarded;
    expect(test.client.getQueryData(options.queryKey)).toBeUndefined();
    test.client.clear();
  });

  it("conserva la colección restaurada cuando su revalidación falla sin conexión", async () => {
    const test = harness();
    const list = vi.fn(async (): Promise<readonly string[]> => {
      throw new Error("Sin conexión");
    });
    const options = getSavedCollectionQueryOptions(
      queryKeys.savedCenters,
      list,
      test.auth(),
    );
    test.client.setQueryData(options.queryKey, ["copia"], {
      updatedAt: Date.now() - 360_000,
    });
    const observer = new QueryObserver(test.client, options);
    const unsubscribe = observer.subscribe(() => undefined);
    await vi.waitFor(() =>
      expect(observer.getCurrentResult().isError).toBe(true),
    );
    expect(observer.getCurrentResult().data).toEqual(["copia"]);
    unsubscribe();
    test.client.clear();
  });

  it("propaga la señal de la opinión propia hasta el transporte", async () => {
    vi.stubEnv("EXPO_PUBLIC_API_URL", "https://api.test/api/v1");
    const test = harness();
    const gate = deferred<Response>();
    test.request.mockReturnValueOnce(gate.promise);
    const options = getOwnCenterOpinionQueryOptions("A", test.auth());
    const reading = test.client.fetchQuery(options);
    const discarded = expect(reading).rejects.toBeDefined();
    const signal = test.request.mock.calls[0][1]?.signal;
    test.changeAccount(null);
    expect(signal?.aborted).toBe(true);
    gate.resolve(Response.json({ data: null }));
    await discarded;
    test.client.clear();
  });
});

describe("mutaciones privadas y callbacks", () => {
  it("no aplica una mutación optimista ni solicita la API como invitado", async () => {
    const test = harness();
    test.changeAccount(null);
    const observer = new MutationObserver(test.client, test.options());
    await expect(
      observer.mutate({ item: "A", currentlySaved: false }),
    ).rejects.toThrow("Inicia sesión");
    expect(test.operations.save).not.toHaveBeenCalled();
    expect(
      test.client.getQueryData([...queryKeys.savedCenters, "anonymous"]),
    ).toBeUndefined();
    test.client.clear();
  });

  it.each([null, 8, 7])(
    "no revierte en la caché de otra sesión al pasar de A a %s",
    async (userId) => {
      const test = harness();
      const oldKey = [...queryKeys.savedCenters, 7];
      test.client.setQueryData(oldKey, ["anterior"]);
      const gate = deferred<void>();
      test.operations.save.mockReturnValueOnce(gate.promise);
      const observer = new MutationObserver(test.client, test.options());
      const operation = observer.mutate({
        item: "nuevo",
        currentlySaved: false,
      });
      const discarded = expect(operation).rejects.toThrow("rechazado");
      await vi.waitFor(() =>
        expect(test.operations.save).toHaveBeenCalledOnce(),
      );
      test.changeAccount(userId);
      const currentKey = [...queryKeys.savedCenters, userId ?? "anonymous"];
      test.client.setQueryData(currentKey, ["actual"]);
      observer.setOptions(test.options());
      gate.reject(new Error("rechazado"));
      await discarded;
      expect(test.client.getQueryData(currentKey)).toEqual(["actual"]);
      expect(test.client.getQueryState(currentKey)?.isInvalidated).toBe(false);
      if (userId !== 7)
        expect(test.client.getQueryData(oldKey)).toBeUndefined();
      test.client.clear();
    },
  );

  it("detiene el guardado si la cuenta cambia mientras onMutate esperaba la cancelación", async () => {
    const test = harness();
    const gate = deferred<void>();
    vi.spyOn(test.client, "cancelQueries").mockReturnValueOnce(gate.promise);
    const observer = new MutationObserver(test.client, test.options());
    const operation = observer.mutate({ item: "nuevo", currentlySaved: false });
    const discarded = expect(operation).rejects.toMatchObject({
      name: "AbortError",
    });
    await vi.waitFor(() =>
      expect(test.client.cancelQueries).toHaveBeenCalledOnce(),
    );
    test.changeAccount(8);
    observer.setOptions(test.options());
    gate.resolve();
    await discarded;
    expect(test.operations.save).not.toHaveBeenCalled();
    expect(
      test.client.getQueryData([...queryKeys.savedCenters, 8]),
    ).toBeUndefined();
    test.client.clear();
  });

  it("no revierte otro cambio optimista ni revalida antes de terminar todos los guardados", async () => {
    const test = harness();
    const key = [...queryKeys.savedCenters, 7];
    test.client.setQueryData(key, []);
    const list = vi.fn(async () => ["B"]);
    const query = new QueryObserver(test.client, {
      queryKey: key,
      queryFn: list,
      staleTime: Infinity,
    });
    const unsubscribe = query.subscribe(() => undefined);
    const first = deferred<void>();
    const second = deferred<void>();
    test.operations.save
      .mockReturnValueOnce(first.promise)
      .mockReturnValueOnce(second.promise);
    const mutation = new MutationObserver(test.client, test.options());
    const firstOperation = mutation.mutate({
      item: "A",
      currentlySaved: false,
    });
    const rejected = expect(firstOperation).rejects.toThrow("rechazado");
    await vi.waitFor(() =>
      expect(test.operations.save).toHaveBeenCalledTimes(1),
    );
    const secondOperation = mutation.mutate({
      item: "B",
      currentlySaved: false,
    });
    await vi.waitFor(() =>
      expect(test.operations.save).toHaveBeenCalledTimes(2),
    );
    first.reject(new Error("rechazado"));
    await rejected;
    expect(test.client.getQueryData(key)).toContain("B");
    expect(list).not.toHaveBeenCalled();
    second.resolve();
    await secondOperation;
    expect(list).toHaveBeenCalledOnce();
    expect(test.client.getQueryData(key)).toEqual(["B"]);
    unsubscribe();
    test.client.clear();
  });

  it("descarta el éxito tardío de una opinión y no lo escribe para la cuenta nueva", async () => {
    vi.stubEnv("EXPO_PUBLIC_API_URL", "https://api.test/api/v1");
    const test = harness();
    const state = {
      status: "PENDIENTE",
      current: null,
      pending: null,
      lastRejected: null,
      canCreate: false,
      canEdit: false,
    };
    const gate = deferred<Response>();
    test.request.mockReturnValueOnce(gate.promise);
    const observer = new MutationObserver(
      test.client,
      getCenterOpinionMutationOptions(test.client, test.auth()),
    );
    const operation = observer.mutate({
      code: "A",
      content: { rating: 5, comment: "Visita" },
      mode: "create",
    });
    const discarded = expect(operation).rejects.toMatchObject({
      name: "AbortError",
    });
    await vi.waitFor(() => expect(test.request).toHaveBeenCalledOnce());
    test.changeAccount(8);
    const currentKey = [...queryKeys.ownOpinion, "A", 8];
    test.client.setQueryData(currentKey, "actual");
    observer.setOptions(
      getCenterOpinionMutationOptions(test.client, test.auth()),
    );
    gate.resolve(Response.json({ data: state }));
    await discarded;
    expect(test.client.getQueryData(currentKey)).toBe("actual");
    expect(
      test.client.getQueryData([...queryKeys.ownOpinion, "A", 7]),
    ).toBeUndefined();
    test.client.clear();
  });
});
