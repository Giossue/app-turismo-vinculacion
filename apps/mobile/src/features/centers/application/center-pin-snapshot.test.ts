import { QueryClient } from "@tanstack/react-query";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { ApiError } from "@/core/api/http";
import { ONE_DAY_MS } from "@/core/api/query-keys";
import type { PublicCenter } from "../domain/public-center";
import {
  getCenterPinSnapshotQueryOptions,
  selectSnapshotCenters,
} from "./center-pin-snapshot";

const storage = vi.hoisted(() => ({
  readCenterPinSnapshot: vi.fn(),
  saveCenterPinSnapshot: vi.fn(),
}));
vi.mock("../data/center-pin-snapshot-storage", () => storage);

const api = vi.hoisted(() => ({ getPublishedMapCenterPage: vi.fn() }));
vi.mock("../data/public-centers-api", () => api);

const center = (code: string, categoryCode = "AN") =>
  ({ code, name: code, categoryCode }) as unknown as PublicCenter;

const fetchSnapshot = () =>
  new QueryClient().fetchQuery(getCenterPinSnapshotQueryOptions());

beforeEach(() => {
  storage.readCenterPinSnapshot.mockResolvedValue(null);
  storage.saveCenterPinSnapshot.mockResolvedValue(undefined);
});
afterEach(() => vi.resetAllMocks());

describe("copia nacional de pines", () => {
  it("guarda todas las páginas para abrir sin conexión", async () => {
    api.getPublishedMapCenterPage
      .mockResolvedValueOnce({
        data: [center("A")],
        meta: { offset: 0, limit: 1, total: 2 },
      })
      .mockResolvedValueOnce({
        data: [center("B")],
        meta: { offset: 1, limit: 1, total: 2 },
      });

    await expect(fetchSnapshot()).resolves.toEqual([center("A"), center("B")]);
    expect(storage.saveCenterPinSnapshot).toHaveBeenCalledWith([
      center("A"),
      center("B"),
    ]);
  });

  it("no consulta la API si la copia tiene menos de un día", async () => {
    storage.readCenterPinSnapshot.mockResolvedValue({
      savedAt: Date.now() - 1_000,
      centers: [center("A")],
    });

    await expect(fetchSnapshot()).resolves.toEqual([center("A")]);
    expect(api.getPublishedMapCenterPage).not.toHaveBeenCalled();
  });

  it("usa una copia antigua cuando no hay conexión", async () => {
    storage.readCenterPinSnapshot.mockResolvedValue({
      savedAt: Date.now() - 3 * ONE_DAY_MS,
      centers: [center("A")],
    });
    api.getPublishedMapCenterPage.mockRejectedValue(new ApiError("sin red"));

    await expect(fetchSnapshot()).resolves.toEqual([center("A")]);
  });

  it("falla si no hay red ni copia", async () => {
    api.getPublishedMapCenterPage.mockRejectedValue(new ApiError("sin red"));
    await expect(fetchSnapshot()).rejects.toThrow("sin red");
  });

  it("nunca guarda el área visible en la clave", () => {
    expect(
      JSON.stringify(getCenterPinSnapshotQueryOptions().queryKey),
    ).not.toMatch(/\d/);
  });

  it("aplica los filtros de Explorar a la copia", () => {
    const centers = [center("A", "AN"), center("B", "MC")];
    expect(selectSnapshotCenters(centers, { categoryCode: "MC" })).toEqual([
      centers[1],
    ]);
    expect(selectSnapshotCenters(centers, {})).toBe(centers);
    expect(selectSnapshotCenters(undefined, {})).toEqual([]);
  });
});
