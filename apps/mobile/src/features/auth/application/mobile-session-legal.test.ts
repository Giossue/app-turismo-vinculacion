import { describe, expect, it, vi } from "vitest";

import type { LegalDocumentType } from "@/features/legal/domain/legal-document";
import {
  deferred,
  harness,
  response,
  resultA,
  userA,
} from "./mobile-session.fixtures";

const allDocuments: LegalDocumentType[] = ["terms", "privacy"];
const pendingUser = { ...userA, pendingLegalDocuments: allDocuments };
const clearedUser = { ...userA, pendingLegalDocuments: [] };
const pendingResult = { ...resultA, user: pendingUser };
const failure = (status: number, code: string) =>
  Response.json({ error: { code, message: "Mensaje." } }, { status });
const callsTo = (
  fetcher: ReturnType<typeof harness>["fetcher"],
  path: string,
) => fetcher.mock.calls.filter(([url]) => String(url).endsWith(path));

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
    test.fetcher.mockResolvedValueOnce(response({ pendingLegalDocuments: [] }));
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
    test.fetcher.mockResolvedValueOnce(failure(409, "LEGAL_VERSION_OUTDATED"));
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

  it("borra del dispositivo los datos de la cuenta eliminada", async () => {
    const test = await signedIn();
    const userId = test.session.getSnapshot().user?.id;
    test.fetcher.mockResolvedValueOnce(response({ deleted: true }));
    await expect(test.session.deleteAccount("prueba")).resolves.toBe(true);
    expect(test.clearAccountDeviceData).toHaveBeenCalledWith(userId);
  });

  it("avisa si no pudo borrar los datos del dispositivo", async () => {
    const test = await signedIn();
    test.clearAccountDeviceData.mockRejectedValueOnce(new Error("disco"));
    test.fetcher.mockResolvedValueOnce(response({ deleted: true }));
    await expect(test.session.deleteAccount("prueba")).resolves.toBe(false);
  });

  it("no borra datos del dispositivo si la API rechaza la eliminación", async () => {
    const test = await signedIn();
    test.fetcher.mockRejectedValueOnce(new TypeError("Network request failed"));
    await expect(test.session.deleteAccount("prueba")).rejects.toThrow();
    expect(test.clearAccountDeviceData).not.toHaveBeenCalled();
  });

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
