import { QueryClient } from "@tanstack/react-query";
import { afterEach, describe, expect, it, vi } from "vitest";

import { ApiError } from "@/core/api/http";
import type { PublicEstablishmentDetail } from "../domain/establishment";
import { getPublishedEstablishmentQueryOptions } from "./use-published-establishment";

const offline = vi.hoisted(() => ({ getStoredOfflineEstablishment: vi.fn() }));
vi.mock("@/features/offline/application/offline-fallback", () => offline);

const api = vi.hoisted(() => ({ getPublishedEstablishment: vi.fn() }));
vi.mock("../data/establishments-api", () => api);

const stored = { id: 7, nombreComercial: "Hostal", photos: [] };

const fetchDetail = (client = new QueryClient()) =>
  client.fetchQuery({
    ...getPublishedEstablishmentQueryOptions(7),
    retry: false,
    staleTime: 0,
  });

afterEach(() => vi.resetAllMocks());

describe("ficha de catastro sin conexión", () => {
  it("abre la copia descargada", async () => {
    api.getPublishedEstablishment.mockRejectedValue(new ApiError("sin red"));
    offline.getStoredOfflineEstablishment.mockResolvedValue(stored);
    await expect(fetchDetail()).resolves.toEqual(stored);
  });

  it("conserva una ficha con fotos ya vista", async () => {
    const client = new QueryClient();
    const seen = {
      ...stored,
      photos: [{ id: 1, url: "a.jpg", description: null }],
    } as unknown as PublicEstablishmentDetail;
    client.setQueryData(
      getPublishedEstablishmentQueryOptions(7).queryKey,
      seen,
    );
    api.getPublishedEstablishment.mockRejectedValue(new ApiError("sin red"));
    offline.getStoredOfflineEstablishment.mockResolvedValue(stored);

    const { queryKey } = getPublishedEstablishmentQueryOptions(7);
    const before = client.getQueryState(queryKey)?.dataUpdatedAt;
    await expect(fetchDetail(client)).rejects.toThrow("sin red");
    expect(client.getQueryData(queryKey)).toEqual(seen);
    expect(client.getQueryState(queryKey)?.dataUpdatedAt).toBe(before);
  });

  it("mantiene el error si el lugar no está descargado", async () => {
    api.getPublishedEstablishment.mockRejectedValue(new ApiError("sin red"));
    offline.getStoredOfflineEstablishment.mockResolvedValue(null);
    await expect(fetchDetail()).rejects.toThrow("sin red");
  });

  it("olvida la copia de un lugar retirado aunque después se pierda la red", async () => {
    const client = new QueryClient();
    const { queryKey } = getPublishedEstablishmentQueryOptions(7);
    client.setQueryData(queryKey, stored as never);
    api.getPublishedEstablishment.mockRejectedValueOnce(
      new ApiError("no existe", { status: 404 }),
    );
    await expect(fetchDetail(client)).rejects.toMatchObject({ status: 404 });
    expect(client.getQueryData(queryKey)).toBeUndefined();

    api.getPublishedEstablishment.mockRejectedValueOnce(
      new ApiError("sin red"),
    );
    offline.getStoredOfflineEstablishment.mockResolvedValue(null);
    await expect(fetchDetail(client)).rejects.toThrow("sin red");
    expect(client.getQueryData(queryKey)).toBeUndefined();
  });

  it("no olvida la copia si la petición se cancela", async () => {
    const client = new QueryClient();
    const { queryKey } = getPublishedEstablishmentQueryOptions(7);
    client.setQueryData(queryKey, stored as never);
    api.getPublishedEstablishment.mockRejectedValue(new Error("cancelada"));
    await expect(fetchDetail(client)).rejects.toThrow("cancelada");
    expect(client.getQueryData(queryKey)).toEqual(stored);
  });

  it("no revive un establecimiento retirado", async () => {
    api.getPublishedEstablishment.mockRejectedValue(
      new ApiError("no existe", { status: 404 }),
    );
    await expect(fetchDetail()).rejects.toMatchObject({ status: 404 });
    expect(offline.getStoredOfflineEstablishment).not.toHaveBeenCalled();
  });
});
