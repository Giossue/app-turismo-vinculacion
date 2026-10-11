import {
  focusManager,
  onlineManager,
  QueryClient,
  QueryObserver,
} from "@tanstack/react-query";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { ApiError } from "@/core/api/http";
import type { OfflineCityManifest } from "@/features/offline/domain/offline-city";
import {
  getExploreOfflineMap,
  startOfflineMapRetry,
} from "@/features/explore/application/explore-offline-query-state";
import type { PublicCenterDetail } from "../domain/public-center";
import { getDiscoveryCatalogQueryOptions } from "./use-discovery-catalog";
import { getPublishedCenterQueryOptions } from "./use-published-center";

const offline = vi.hoisted(() => ({
  getStoredOfflineCenter: vi.fn(),
  getStoredOfflineCenters: vi.fn(),
}));
vi.mock("@/features/offline/application/offline-fallback", () => offline);

const center: PublicCenterDetail = {
  code: "C1",
  name: "Mirador",
  description: null,
  latitude: -1.59,
  longitude: -79,
  category: "Naturales",
  type: "Montañas",
  subtype: "Miradores",
  hierarchy: null,
  categoryCode: "AN",
  typeCode: "01",
  subtypeCode: "02",
  provinceCode: "02",
  cantonCode: "01",
  parishCode: "01",
  hierarchyCode: null,
  touristZone: "Guaranda",
  address: null,
  admission: null,
  altitudeMeters: null,
  activities: [],
  accessibility: [],
  facilities: [],
  photos: [],
};

const clients: QueryClient[] = [];
function queryClient() {
  const client = new QueryClient({
    defaultOptions: { queries: { gcTime: Infinity } },
  });
  clients.push(client);
  return client;
}

beforeEach(() => vi.stubEnv("EXPO_PUBLIC_API_URL", "https://api.test/api/v1"));

afterEach(() => {
  for (const client of clients.splice(0)) client.clear();
  onlineManager.setOnline(true);
  focusManager.setFocused(undefined);
  vi.clearAllMocks();
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
  vi.useRealTimers();
});

describe("descargas disponibles al arrancar sin conexión", () => {
  it("abre una ficha descargada aunque el gestor de red esté desconectado", async () => {
    onlineManager.setOnline(false);
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new TypeError("sin red")));
    offline.getStoredOfflineCenter.mockResolvedValueOnce(center);
    await expect(
      queryClient().fetchQuery(getPublishedCenterQueryOptions("C1")),
    ).resolves.toEqual(center);
    expect(offline.getStoredOfflineCenter).toHaveBeenCalledWith("C1");
  });

  it("obtiene los filtros de las descargas sin conexión", async () => {
    onlineManager.setOnline(false);
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new TypeError("sin red")));
    offline.getStoredOfflineCenters.mockResolvedValueOnce([center]);
    const result = await queryClient().fetchQuery(
      getDiscoveryCatalogQueryOptions(),
    );
    expect(result.categories).toEqual([{ code: "AN", name: "Naturales" }]);
    expect(result.provinces).toEqual([]);
  });

  it.each([404, 403])(
    "no revive una ficha rechazada por la API (%i)",
    async (status) => {
      vi.stubGlobal(
        "fetch",
        vi.fn(async () => new Response(null, { status })),
      );
      await expect(
        queryClient().fetchQuery({
          ...getPublishedCenterQueryOptions("C1"),
          retry: false,
        }),
      ).rejects.toMatchObject({ status });
      expect(offline.getStoredOfflineCenter).not.toHaveBeenCalled();
    },
  );

  it("cancela el transporte al cerrar la ficha y no consulta SQLite", async () => {
    let signal: AbortSignal | undefined;
    vi.stubGlobal(
      "fetch",
      vi.fn((_url: unknown, init: RequestInit) => {
        signal = init.signal ?? undefined;
        return new Promise<Response>((_resolve, reject) => {
          signal?.addEventListener("abort", () =>
            reject(new DOMException("cancelada", "AbortError")),
          );
        });
      }),
    );
    const observer = new QueryObserver(
      queryClient(),
      getPublishedCenterQueryOptions("C1"),
    );
    const unsubscribe = observer.subscribe(() => undefined);
    expect(signal).toBeDefined();
    unsubscribe();
    expect(signal?.aborted).toBe(true);
    await Promise.resolve();
    expect(offline.getStoredOfflineCenter).not.toHaveBeenCalled();
  });

  it("dibuja las descargas cuando la consulta remota arranca pausada", () => {
    onlineManager.setOnline(false);
    const fetch = vi.fn(async () => []);
    const observer = new QueryObserver(queryClient(), {
      queryKey: ["map"],
      queryFn: fetch,
    });
    const unsubscribe = observer.subscribe(() => undefined);
    const manifest = {
      centers: [center],
      establishments: [],
      pois: [],
    } as unknown as OfflineCityManifest;
    const result = observer.getCurrentResult();
    expect(result.isPaused).toBe(true);
    expect(getExploreOfflineMap(result, [manifest], null)?.centers).toEqual([
      center,
    ]);
    expect(fetch).not.toHaveBeenCalled();
    unsubscribe();
  });

  it("no usa descargas para errores de autorización del mapa", () => {
    const result = {
      isPaused: false,
      isError: true,
      error: new ApiError("prohibido", { status: 403 }),
    };
    const manifest = {
      centers: [center],
      establishments: [],
      pois: [],
    } as unknown as OfflineCityManifest;
    expect(getExploreOfflineMap(result, [manifest], null)).toBeNull();
  });

  it("suspende el reintento periódico sin foco o red y limpia el temporizador", () => {
    vi.useFakeTimers();
    const refetch = vi.fn(async () => undefined);
    focusManager.setFocused(false);
    const stop = startOfflineMapRetry(refetch);
    vi.advanceTimersByTime(30_000);
    expect(refetch).not.toHaveBeenCalled();
    focusManager.setFocused(true);
    onlineManager.setOnline(false);
    vi.advanceTimersByTime(30_000);
    expect(refetch).not.toHaveBeenCalled();
    onlineManager.setOnline(true);
    vi.advanceTimersByTime(30_000);
    expect(refetch).toHaveBeenCalledOnce();
    stop();
    vi.advanceTimersByTime(30_000);
    expect(refetch).toHaveBeenCalledOnce();
  });
});
