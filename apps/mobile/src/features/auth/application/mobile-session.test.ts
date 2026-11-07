import { describe, expect, it, vi } from "vitest";

import {
  acceptLegalDocuments,
  deleteAccount,
  getSessionUser,
  loginMobile,
  logoutMobile,
  refreshMobile,
  registerMobile,
} from "../data/auth-api";
import type { StoredSession } from "../data/stored-user";
import { MobileSession, type SessionResult } from "./mobile-session";

const apiUrl = "https://api.test/api/v1";
const userA = { id: 7, name: "Ana", email: "ana@test.com", roles: ["TURISTA"] };
const userB = { id: 8, name: "Bea", email: "bea@test.com", roles: ["TURISTA"] };
const resultA = {
  accessToken: "access-a",
  refreshToken: "refresh-a",
  user: userA,
};
const resultB = {
  accessToken: "access-b",
  refreshToken: "refresh-b",
  user: userB,
};

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((complete) => {
    resolve = complete;
  });
  return { promise, resolve };
}
const response = (data: unknown, status = 200) =>
  Response.json({ data }, { status });

function harness(initial: StoredSession | null = null) {
  let stored = initial;
  const fetcher = vi.fn(
    async (_input: RequestInfo | URL, _init?: RequestInit) => response(resultA),
  );
  const storage = {
    read: vi.fn(async () => stored),
    save: vi.fn(async (refreshToken: string, user: typeof userA) => {
      stored = { refreshToken, user };
    }),
    clear: vi.fn(async () => {
      stored = null;
    }),
  };
  const retainAccount = vi.fn(async (_id: number | null) => undefined);
  const session = new MobileSession({
    apiUrl: () => apiUrl,
    fetcher,
    retainAccount,
    storage,
    api: {
      login: (email, password, request) =>
        loginMobile(email, password, request, apiUrl),
      register: (input, request) => registerMobile(input, request, apiUrl),
      refresh: (token, request) => refreshMobile(token, request, apiUrl),
      logout: (token, request) => logoutMobile(token, request, apiUrl),
      acceptLegal: (input, request) =>
        acceptLegalDocuments(input, request, apiUrl),
      deleteAccount: (password, request) =>
        deleteAccount(password, request, apiUrl),
      sessionUser: (request) => getSessionUser(request, apiUrl),
    },
  });
  return {
    session,
    fetcher,
    storage,
    retainAccount,
    stored: () => stored,
    request: () =>
      session.requestForGeneration(session.getSnapshot().generation),
    scope: () => ({
      generation: session.getSnapshot().generation,
      userId: session.getSnapshot().user!.id,
    }),
  };
}

describe("aislamiento de la sesión móvil", () => {
  it("retira también el token en memoria si ya no hay sesión renovable", async () => {
    const test = harness();
    await test.session.login("ana@test.com", "prueba");
    await test.storage.clear();
    expect(await test.session.refresh()).toBe(false);
    expect(test.session.getSnapshot().status).toBe("anonymous");
    await test.request()(`${apiUrl}/favorites/centers`);
    expect(
      new Headers(test.fetcher.mock.calls.at(-1)![1]?.headers).has(
        "Authorization",
      ),
    ).toBe(false);
  });

  it("comparte una restauración concurrente", async () => {
    const test = harness({ refreshToken: "refresh-a", user: userA });
    const gate = deferred<Response>();
    test.fetcher.mockReturnValueOnce(gate.promise);
    const first = test.session.refresh();
    const second = test.session.refresh();
    expect(first).toBe(second);
    await vi.waitFor(() => expect(test.fetcher).toHaveBeenCalledOnce());
    gate.resolve(response(resultA));
    expect(await first).toBe(true);
    expect(test.session.getSnapshot().user).toEqual(userA);
    expect(test.storage.save).toHaveBeenCalledOnce();
  });

  it("mantiene el perfil y los favoritos de su propietario cuando la API no está disponible", async () => {
    const test = harness({ refreshToken: "refresh-a", user: userA });
    test.fetcher.mockRejectedValueOnce(new TypeError("Sin conexión"));
    expect(await test.session.refresh()).toBe(false);
    expect(test.session.getSnapshot().status).toBe("authenticated");
    expect(test.session.getSnapshot().user).toEqual(userA);
    expect(test.retainAccount).toHaveBeenLastCalledWith(7);
    expect(test.stored()?.refreshToken).toBe("refresh-a");
  });

  it("elimina una sesión que la API rechaza", async () => {
    const test = harness({ refreshToken: "refresh-a", user: userA });
    test.fetcher.mockResolvedValueOnce(response(null, 401));
    expect(await test.session.refresh()).toBe(false);
    expect(test.session.getSnapshot().status).toBe("anonymous");
    expect(test.stored()).toBeNull();
    expect(test.retainAccount).toHaveBeenLastCalledWith(null);
  });

  it("cierra localmente sin esperar una revocación remota y descarta la renovación tardía", async () => {
    const test = harness({ refreshToken: "refresh-a", user: userA });
    const renewal = deferred<Response>();
    const revocation = deferred<Response>();
    test.fetcher.mockReturnValueOnce(renewal.promise);
    test.fetcher.mockReturnValueOnce(revocation.promise);
    const refreshing = test.session.refresh();
    await vi.waitFor(() => expect(test.fetcher).toHaveBeenCalledOnce());
    const signal = test.fetcher.mock.calls[0][1]?.signal;
    const loggingOut = test.session.logout();
    expect(test.session.getSnapshot().status).toBe("anonymous");
    expect(signal?.aborted).toBe(true);
    await loggingOut;
    expect(test.stored()).toBeNull();
    renewal.resolve(response(resultA));
    expect(await refreshing).toBe(false);
    expect(test.storage.save).not.toHaveBeenCalled();
    expect(test.session.getSnapshot().user).toBeNull();
    revocation.resolve(new Response(null, { status: 204 }));
  });

  it.each(["login", "register"])(
    "descarta un %s que termina después de salir",
    async (method) => {
      const test = harness();
      const gate = deferred<Response>();
      test.fetcher.mockReturnValueOnce(gate.promise);
      const operation =
        method === "login"
          ? test.session.login("ana@test.com", "contraseña de prueba")
          : test.session.register({
              acceptedLegal: { terms: "2026-11", privacy: "2026-12" },
              birthDate: "1998-02-03",
              name: "Ana",
              email: "ana@test.com",
              password: "contraseña de prueba",
              gender: "Femenino",
            });
      const rejected = expect(operation).rejects.toMatchObject({
        name: "AbortError",
      });
      await vi.waitFor(() => expect(test.fetcher).toHaveBeenCalledOnce());
      await test.session.logout();
      gate.resolve(response(resultA));
      await rejected;
      expect(test.stored()).toBeNull();
      expect(test.storage.save).not.toHaveBeenCalled();
    },
  );

  it("ordena un guardado ya iniciado, el borrado y el acceso de una cuenta nueva", async () => {
    const test = harness();
    const gate = deferred<void>();
    const save = test.storage.save.getMockImplementation()!;
    test.storage.save.mockImplementationOnce(async (token, user) => {
      await gate.promise;
      await save(token, user);
    });
    const firstLogin = test.session.login("ana@test.com", "prueba");
    const discarded = expect(firstLogin).rejects.toMatchObject({
      name: "AbortError",
    });
    await vi.waitFor(() => expect(test.storage.save).toHaveBeenCalledOnce());
    const loggingOut = test.session.logout();
    test.fetcher.mockImplementation(async (input) =>
      String(input).endsWith("/logout")
        ? new Response(null, { status: 204 })
        : response(resultB),
    );
    const secondLogin = test.session.login("bea@test.com", "prueba");
    gate.resolve();
    await Promise.all([discarded, loggingOut, secondLogin]);
    expect(test.stored()?.user).toEqual(userB);
    expect(test.session.getSnapshot().user).toEqual(userB);
    const logout = test.fetcher.mock.calls.find(([url]) =>
      String(url).endsWith("/logout"),
    );
    expect(JSON.parse(logout![1]!.body as string).refreshToken).toBe(
      "refresh-a",
    );
  });

  it("rechaza un 401 de la cuenta anterior sin renovar ni repetir como la nueva cuenta", async () => {
    const test = harness();
    await test.session.login("ana@test.com", "prueba");
    const previousScope = test.scope();
    const previousRequest = test.request();
    const gate = deferred<Response>();
    test.fetcher.mockReturnValueOnce(gate.promise);
    const request = previousRequest(`${apiUrl}/favorites/centers`);
    const discarded = expect(request).rejects.toMatchObject({
      name: "AbortError",
    });
    const signal = test.fetcher.mock.calls.at(-1)![1]?.signal;
    test.fetcher.mockResolvedValueOnce(response(resultB));
    await test.session.login("bea@test.com", "prueba");
    gate.resolve(response(null, 401));
    await discarded;
    expect(signal?.aborted).toBe(true);
    expect(test.session.isCurrentSession(previousScope)).toBe(false);
    expect(test.session.getSnapshot().user).toEqual(userB);
    expect(
      test.fetcher.mock.calls.filter(([url]) =>
        String(url).endsWith("/refresh"),
      ),
    ).toHaveLength(0);
    expect(
      test.fetcher.mock.calls.filter(([url]) =>
        String(url).includes("/favorites"),
      ),
    ).toHaveLength(1);
    await expect(
      previousRequest(`${apiUrl}/favorites/centers`),
    ).rejects.toMatchObject({ name: "AbortError" });
  });

  it("repite una sola vez un 401 y evita renovar otra vez por un 401 antiguo", async () => {
    const test = harness();
    await test.session.login("ana@test.com", "prueba");
    const firstResponse = deferred<Response>();
    let oldRequests = 0;
    let refreshes = 0;
    test.fetcher.mockImplementation(async (input, init) => {
      if (String(input).endsWith("/refresh")) {
        refreshes++;
        return response({ ...resultA, accessToken: "access-new" });
      }
      if (
        new Headers(init?.headers).get("Authorization") === "Bearer access-a"
      ) {
        oldRequests++;
        return oldRequests === 1 ? firstResponse.promise : response(null, 401);
      }
      return response([]);
    });
    const request = test.request();
    const first = request(`${apiUrl}/favorites/centers`);
    const second = request(`${apiUrl}/favorites/centers`);
    expect((await second).status).toBe(200);
    firstResponse.resolve(response(null, 401));
    expect((await first).status).toBe(200);
    expect(refreshes).toBe(1);
    expect(oldRequests).toBe(2);
  });

  it("devuelve el segundo 401 sin entrar en un bucle de renovación", async () => {
    const test = harness();
    await test.session.login("ana@test.com", "prueba");
    test.fetcher.mockImplementation(async (input) =>
      String(input).endsWith("/refresh")
        ? response(resultA)
        : response(null, 401),
    );
    const result = await test.request()(`${apiUrl}/favorites/centers`);
    expect(result.status).toBe(401);
    expect(
      test.fetcher.mock.calls.filter(([url]) =>
        String(url).endsWith("/refresh"),
      ),
    ).toHaveLength(1);
    expect(
      test.fetcher.mock.calls.filter(([url]) =>
        String(url).includes("/favorites"),
      ),
    ).toHaveLength(2);
  });

  it("transmite la cancelación de la consulta y nunca envía credenciales a otra API", async () => {
    const test = harness();
    await test.session.login("ana@test.com", "prueba");
    const gate = deferred<Response>();
    test.fetcher.mockReturnValueOnce(gate.promise);
    const caller = new AbortController();
    const result = test.request()(`${apiUrl}/favorites/centers`, {
      signal: caller.signal,
    });
    const discarded = expect(result).rejects.toMatchObject({
      name: "AbortError",
    });
    const signal = test.fetcher.mock.calls.at(-1)![1]?.signal;
    caller.abort();
    expect(signal?.aborted).toBe(true);
    gate.resolve(response([]));
    await discarded;
    await test.request()("https://tiles.test/style.json");
    expect(test.fetcher.mock.calls.at(-1)![1]?.headers).toBeUndefined();
  });

  it("invalida callbacks de la misma cuenta al cambiar sus roles", async () => {
    const test = harness();
    await test.session.login("ana@test.com", "prueba");
    const scope = test.scope();
    const result: SessionResult = { ...resultA, user: { ...userA, roles: [] } };
    test.fetcher.mockResolvedValueOnce(response(result));
    expect(await test.session.refresh()).toBe(true);
    expect(test.session.isCurrentSession(scope)).toBe(false);
    expect(test.session.getSnapshot().user?.roles).toEqual([]);
  });

  it("propaga el fallo de borrado pero retira de inmediato el acceso en memoria", async () => {
    const test = harness();
    await test.session.login("ana@test.com", "prueba");
    const scope = test.scope();
    test.storage.clear.mockRejectedValueOnce(
      new Error("Almacén no disponible"),
    );
    await expect(test.session.logout()).rejects.toThrow(
      "Almacén no disponible",
    );
    expect(test.session.getSnapshot().status).toBe("anonymous");
    expect(test.session.isCurrentSession(scope)).toBe(false);
  });

  it("deduplica la reconexión de Strict Mode y cancela la sesión del proveedor desmontado", async () => {
    const test = harness({ refreshToken: "refresh-a", user: userA });
    const firstDetach = test.session.attach();
    firstDetach();
    const secondDetach = test.session.attach();
    await vi.waitFor(() =>
      expect(test.session.getSnapshot().status).toBe("authenticated"),
    );
    expect(test.fetcher).toHaveBeenCalledOnce();
    const scope = test.scope();
    secondDetach();
    await Promise.resolve();
    expect(test.session.isCurrentSession(scope)).toBe(false);
    expect(test.stored()?.user).toEqual(userA);
  });
});

const pendingUser = { ...userA, pendingLegalDocuments: ["terms", "privacy"] };
const clearedUser = { ...userA, pendingLegalDocuments: [] };
const pendingResult = { ...resultA, user: pendingUser };
const failure = (status: number, code: string) =>
  Response.json({ error: { code, message: "Mensaje." } }, { status });
const callsTo = (fetcher: ReturnType<typeof harness>["fetcher"], path: string) =>
  fetcher.mock.calls.filter(([url]) => String(url).endsWith(path));

describe("documentos legales pendientes de la sesión", () => {
  it("los conoce después de iniciar sesión", async () => {
    const test = harness();
    test.fetcher.mockResolvedValueOnce(response(pendingResult));
    await test.session.login("ana@test.com", "prueba");
    expect(test.session.getSnapshot().user?.pendingLegalDocuments).toEqual([
      "terms",
      "privacy",
    ]);
    expect(test.stored()?.user).toEqual(pendingUser);
  });

  it("los actualiza al renovar o restaurar la sesión", async () => {
    const test = harness({ refreshToken: "refresh-a", user: clearedUser });
    test.fetcher.mockResolvedValueOnce(response(pendingResult));
    expect(await test.session.refresh()).toBe(true);
    expect(test.session.getSnapshot().user?.pendingLegalDocuments).toEqual([
      "terms",
      "privacy",
    ]);
  });

  it("restaura sin conexión el último valor conocido", async () => {
    const test = harness({ refreshToken: "refresh-a", user: pendingUser });
    test.fetcher.mockRejectedValueOnce(new TypeError("Sin conexión"));
    await test.session.refresh();
    expect(test.session.getSnapshot().status).toBe("authenticated");
    expect(test.session.getSnapshot().user?.pendingLegalDocuments).toEqual([
      "terms",
      "privacy",
    ]);
  });

  it("no inventa pendientes si el perfil guardado no los trae", async () => {
    const test = harness({ refreshToken: "refresh-a", user: userA });
    test.fetcher.mockRejectedValueOnce(new TypeError("Sin conexión"));
    await test.session.refresh();
    expect(test.session.getSnapshot().user?.pendingLegalDocuments).toBe(
      undefined,
    );
  });

  it("al recuperar la conexión renueva una sesión restaurada sin access token", async () => {
    const test = harness({ refreshToken: "refresh-a", user: clearedUser });
    test.fetcher.mockRejectedValueOnce(new TypeError("Sin conexión"));
    await test.session.refresh();
    test.fetcher.mockResolvedValueOnce(response(pendingResult));
    await test.session.reevaluate();
    expect(callsTo(test.fetcher, "/auth/mobile/refresh")).toHaveLength(2);
    expect(callsTo(test.fetcher, "/auth/me")).toHaveLength(0);
    expect(test.session.getSnapshot().user?.pendingLegalDocuments).toEqual([
      "terms",
      "privacy",
    ]);
  });

  it("al recuperar la conexión consulta la sesión sin rotar un token vigente", async () => {
    const test = harness();
    await test.session.login("ana@test.com", "prueba");
    test.fetcher.mockResolvedValueOnce(response({ user: pendingUser }));
    await test.session.reevaluate();
    expect(callsTo(test.fetcher, "/auth/mobile/refresh")).toHaveLength(0);
    expect(test.session.getSnapshot().user?.pendingLegalDocuments).toEqual([
      "terms",
      "privacy",
    ]);
    expect(test.stored()).toEqual({
      refreshToken: "refresh-a",
      user: pendingUser,
    });
  });

  it("conserva el último valor si la consulta falla", async () => {
    const test = harness();
    test.fetcher.mockResolvedValueOnce(response(pendingResult));
    await test.session.login("ana@test.com", "prueba");
    test.fetcher.mockRejectedValueOnce(new TypeError("Sin conexión"));
    await test.session.reevaluate();
    expect(test.session.getSnapshot().status).toBe("authenticated");
    expect(test.session.getSnapshot().user).toEqual(pendingUser);
  });

  it("no consulta nada sin sesión", async () => {
    const test = harness();
    await test.session.refresh();
    test.fetcher.mockClear();
    await test.session.reevaluate();
    expect(test.fetcher).not.toHaveBeenCalled();
  });

  it("guarda el resultado de aceptar en memoria y en disco", async () => {
    const test = harness();
    test.fetcher.mockResolvedValueOnce(response(pendingResult));
    await test.session.login("ana@test.com", "prueba");
    test.fetcher.mockResolvedValueOnce(
      response({ pendingLegalDocuments: [] }),
    );
    await test.session.acceptLegalDocuments({
      acceptedLegal: { terms: "2026-11", privacy: "2026-12" },
      appVersion: "1.4.0",
    });
    expect(test.session.getSnapshot().user).toEqual(clearedUser);
    expect(test.stored()).toEqual({
      refreshToken: "refresh-a",
      user: clearedUser,
    });
    const [, init] = callsTo(test.fetcher, "/auth/legal-acceptances")[0];
    expect(new Headers(init?.headers).get("Authorization")).toBe(
      "Bearer access-a",
    );
  });

  it("mantiene el bloqueo y el disco si la aceptación falla", async () => {
    const test = harness();
    test.fetcher.mockResolvedValueOnce(response(pendingResult));
    await test.session.login("ana@test.com", "prueba");
    test.fetcher.mockResolvedValueOnce(
      failure(409, "LEGAL_VERSION_OUTDATED"),
    );
    await expect(
      test.session.acceptLegalDocuments({
        acceptedLegal: { terms: "2026-11", privacy: "2026-12" },
      }),
    ).rejects.toMatchObject({ code: "LEGAL_VERSION_OUTDATED" });
    expect(test.session.getSnapshot().user).toEqual(pendingUser);
    expect(test.stored()?.user).toEqual(pendingUser);
  });

  it("no escribe en disco una aceptación que llega después de salir", async () => {
    const test = harness();
    test.fetcher.mockResolvedValueOnce(response(pendingResult));
    await test.session.login("ana@test.com", "prueba");
    const gate = deferred<Response>();
    test.fetcher.mockReturnValueOnce(gate.promise);
    const accepting = test.session.acceptLegalDocuments({
      acceptedLegal: { terms: "2026-11", privacy: "2026-12" },
    });
    const rejected = expect(accepting).rejects.toMatchObject({
      name: "AbortError",
    });
    await vi.waitFor(() =>
      expect(callsTo(test.fetcher, "/auth/legal-acceptances")).toHaveLength(1),
    );
    await test.session.logout();
    gate.resolve(response({ pendingLegalDocuments: [] }));
    await rejected;
    expect(test.stored()).toBeNull();
    expect(test.session.getSnapshot().user).toBeNull();
  });

  it("cerrar sesión desde el bloqueo no guarda ninguna aceptación", async () => {
    const test = harness();
    test.fetcher.mockResolvedValueOnce(response(pendingResult));
    await test.session.login("ana@test.com", "prueba");
    await test.session.logout();
    expect(test.session.getSnapshot().status).toBe("anonymous");
    expect(callsTo(test.fetcher, "/auth/legal-acceptances")).toHaveLength(0);
  });
});

describe("eliminación de la cuenta", () => {
  const signedIn = async () => {
    const test = harness();
    await test.session.login("ana@test.com", "prueba");
    return test;
  };

  it("limpia la sesión local como al salir, sin llamar a logout", async () => {
    const test = await signedIn();
    test.fetcher.mockResolvedValueOnce(response({ deleted: true }));
    await expect(test.session.deleteAccount("prueba")).resolves.toBe(true);
    expect(test.session.getSnapshot()).toMatchObject({
      status: "anonymous",
      user: null,
    });
    expect(test.stored()).toBeNull();
    expect(test.retainAccount).toHaveBeenLastCalledWith(null);
    expect(callsTo(test.fetcher, "/auth/mobile/logout")).toHaveLength(0);
    const [, init] = callsTo(test.fetcher, "/auth/account/delete")[0];
    expect(new Headers(init?.headers).get("Authorization")).toBe(
      "Bearer access-a",
    );
  });

  it("conserva la sesión con una contraseña incorrecta", async () => {
    const test = await signedIn();
    test.fetcher.mockResolvedValueOnce(failure(400, "INVALID_PASSWORD"));
    await expect(test.session.deleteAccount("mala")).rejects.toMatchObject({
      code: "INVALID_PASSWORD",
    });
    expect(test.session.getSnapshot().status).toBe("authenticated");
    expect(test.stored()?.refreshToken).toBe("refresh-a");
  });

  it("conserva la sesión ante un error del servidor o de red", async () => {
    const test = await signedIn();
    test.fetcher.mockResolvedValueOnce(failure(500, "INTERNAL_ERROR"));
    await expect(test.session.deleteAccount("prueba")).rejects.toThrow(
      "No se pudo eliminar la cuenta.",
    );
    test.fetcher.mockRejectedValueOnce(new TypeError("Sin conexión"));
    await expect(test.session.deleteAccount("prueba")).rejects.toThrow(
      "No se pudo eliminar la cuenta.",
    );
    expect(test.session.getSnapshot().status).toBe("authenticated");
    expect(test.stored()?.refreshToken).toBe("refresh-a");
  });

  it("envía una sola solicitud aunque se confirme dos veces", async () => {
    const test = await signedIn();
    const gate = deferred<Response>();
    test.fetcher.mockReturnValueOnce(gate.promise);
    const first = test.session.deleteAccount("prueba");
    const second = test.session.deleteAccount("prueba");
    expect(second).toBe(first);
    await vi.waitFor(() =>
      expect(callsTo(test.fetcher, "/auth/account/delete")).toHaveLength(1),
    );
    gate.resolve(response({ deleted: true }));
    await first;
    expect(callsTo(test.fetcher, "/auth/account/delete")).toHaveLength(1);
  });

  it("permite reintentar después de un fallo", async () => {
    const test = await signedIn();
    test.fetcher.mockResolvedValueOnce(failure(400, "INVALID_PASSWORD"));
    await test.session.deleteAccount("mala").catch(() => undefined);
    test.fetcher.mockResolvedValueOnce(response({ deleted: true }));
    await expect(test.session.deleteAccount("buena")).resolves.toBe(true);
  });

  it("informa si el dispositivo no pudo borrar la sesión ya eliminada", async () => {
    const test = await signedIn();
    test.fetcher.mockResolvedValueOnce(response({ deleted: true }));
    test.storage.clear.mockRejectedValueOnce(new Error("SecureStore"));
    await expect(test.session.deleteAccount("prueba")).resolves.toBe(false);
    expect(test.session.getSnapshot().status).toBe("anonymous");
  });
});
