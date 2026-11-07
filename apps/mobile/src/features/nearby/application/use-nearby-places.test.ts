import { QueryClient, type QueryFunction } from "@tanstack/react-query";
import { afterEach, describe, expect, it, vi } from "vitest";

import { ApiError } from "@/core/api/http";
import type { NearbyPlace } from "../domain/nearby-place";
import { getNearbyPlacesQueryOptions } from "./use-nearby-places";

const offline = vi.hoisted(() => ({ getStoredOfflineNearbyPlaces: vi.fn() }));
vi.mock("@/features/offline/application/offline-fallback", () => offline);

const api = vi.hoisted(() => ({ getNearbyPlaces: vi.fn() }));
vi.mock("../data/nearby-api", () => api);

const coordinate = { latitude: -1.6, longitude: -79 };

const fetchPlaces = () => {
  const options = getNearbyPlacesQueryOptions(coordinate);
  return new QueryClient().fetchQuery({
    queryKey: options.queryKey,
    queryFn: options.queryFn as QueryFunction<readonly NearbyPlace[]>,
    retry: false,
  });
};

afterEach(() => vi.resetAllMocks());

describe("Cerca de mí sin conexión", () => {
  it("usa las ciudades descargadas", async () => {
    const places = [{ kind: "center", code: "C1" }];
    api.getNearbyPlaces.mockRejectedValue(new ApiError("sin red"));
    offline.getStoredOfflineNearbyPlaces.mockResolvedValue(places);
    await expect(fetchPlaces()).resolves.toEqual(places);
  });

  it("mantiene el error sin descargas", async () => {
    api.getNearbyPlaces.mockRejectedValue(new ApiError("sin red"));
    offline.getStoredOfflineNearbyPlaces.mockResolvedValue(null);
    await expect(fetchPlaces()).rejects.toThrow("sin red");
  });

  it("no usa descargas ante un error de la petición", async () => {
    api.getNearbyPlaces.mockRejectedValue(
      new ApiError("inválida", { status: 400 }),
    );
    await expect(fetchPlaces()).rejects.toMatchObject({ status: 400 });
    expect(offline.getStoredOfflineNearbyPlaces).not.toHaveBeenCalled();
  });
});
