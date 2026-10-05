import { QueryClient, QueryObserver } from "@tanstack/react-query";
import { afterEach, describe, expect, it, vi } from "vitest";

import { isPersistedQueryKey } from "@/core/api/query-keys";
import type { GeoBoundingBox } from "@/core/geo/types";
import { getPublishedMapCentersQueryOptions } from "./use-published-map-centers";

const firstArea: GeoBoundingBox = [-79.02, -1.62, -78.98, -1.58];
const secondArea: GeoBoundingBox = [-79.04, -1.62, -79.02, -1.58];
const thirdArea: GeoBoundingBox = [-79.06, -1.62, -79.04, -1.58];
const center = {
  code: "A",
  name: "Mirador",
  description: null,
  latitude: -1.59,
  longitude: -79,
  category: "Naturaleza",
  type: "Mirador",
  subtype: "Mirador",
  hierarchy: "III",
  categoryCode: "AN",
  typeCode: "01",
  subtypeCode: "01",
  provinceCode: "02",
  cantonCode: "02",
  parishCode: "01",
  hierarchyCode: "03",
};

afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

describe("visible map center queries", () => {
  it("separates areas and filters without persisting their viewport keys", () => {
    const first = getPublishedMapCentersQueryOptions(firstArea);
    const second = getPublishedMapCentersQueryOptions(secondArea);
    const filtered = getPublishedMapCentersQueryOptions(firstArea, {
      categoryCode: "AN",
    });
    expect(first.queryKey).not.toEqual(second.queryKey);
    expect(first.queryKey).not.toEqual(filtered.queryKey);
    expect(isPersistedQueryKey(first.queryKey)).toBe(false);
    expect(isPersistedQueryKey(filtered.queryKey)).toBe(false);
  });

  it("shares one key between viewports inside the same grid cells", () => {
    const first = getPublishedMapCentersQueryOptions(firstArea);
    const nudged = getPublishedMapCentersQueryOptions([
      -79.0196, -1.6192, -78.9804, -1.5804,
    ]);
    expect(nudged.queryKey).toEqual(first.queryKey);
    expect(first.queryKey.at(-1)).toEqual({
      west: -79.02,
      south: -1.62,
      east: -78.98,
      north: -1.58,
    });
  });

  it("waits for a valid camera box instead of requesting an arbitrary national list", () => {
    const fetcher = vi.fn();
    vi.stubGlobal("fetch", fetcher);
    const client = new QueryClient();
    const observer = new QueryObserver(
      client,
      getPublishedMapCentersQueryOptions(null),
    );
    const unsubscribe = observer.subscribe(() => undefined);
    expect(fetcher).not.toHaveBeenCalled();
    expect(observer.getCurrentResult().isFetching).toBe(false);
    expect(
      getPublishedMapCentersQueryOptions([-78.98, -1.62, -79.02, -1.58])
        .enabled,
    ).toBe(false);
    unsubscribe();
    client.clear();
  });

  it("keeps the old pins while moving, cancels stale areas and accepts an empty new area", async () => {
    const requests: {
      resolve: (response: Response) => void;
      signal?: AbortSignal | null;
    }[] = [];
    const fetcher = vi.fn(
      (_url: RequestInfo | URL, init?: RequestInit) =>
        new Promise<Response>((resolve, reject) => {
          requests.push({ resolve, signal: init?.signal });
          init?.signal?.addEventListener(
            "abort",
            () => reject(new DOMException("Stopped", "AbortError")),
            { once: true },
          );
        }),
    );
    vi.stubGlobal("fetch", fetcher);
    vi.stubEnv("EXPO_PUBLIC_API_URL", "http://api.test/api/v1");
    const client = new QueryClient();
    const observer = new QueryObserver(
      client,
      getPublishedMapCentersQueryOptions(firstArea),
    );
    const unsubscribe = observer.subscribe(() => undefined);
    const response = (data: (typeof center)[]): Response =>
      ({
        ok: true,
        json: async () => ({
          data,
          meta: { total: data.length, limit: 100, offset: 0 },
        }),
      }) as Response;
    await vi.waitFor(() => expect(requests).toHaveLength(1));
    requests[0].resolve(response([center]));
    await vi.waitFor(() =>
      expect(observer.getCurrentResult().data).toEqual([center]),
    );

    observer.setOptions(getPublishedMapCentersQueryOptions(secondArea));
    await vi.waitFor(() => expect(requests).toHaveLength(2));
    expect(observer.getCurrentResult().data).toEqual([center]);
    expect(observer.getCurrentResult().isPlaceholderData).toBe(true);

    observer.setOptions(getPublishedMapCentersQueryOptions(thirdArea));
    await vi.waitFor(() => expect(requests).toHaveLength(3));
    expect(requests[1].signal?.aborted).toBe(true);
    requests[2].resolve(response([]));
    await vi.waitFor(() =>
      expect(observer.getCurrentResult().data).toEqual([]),
    );
    requests[1].resolve(response([center]));
    expect(observer.getCurrentResult().data).toEqual([]);
    expect(observer.getCurrentResult().error).toBeNull();
    unsubscribe();
    client.clear();
  });
});
