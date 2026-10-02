import {
  QueryClient,
  QueryObserver,
  onlineManager,
} from "@tanstack/react-query";
import { afterEach, describe, expect, it, vi } from "vitest";
import { isPersistedQueryKey } from "@/core/api/query-keys";
import { getPublicSearchQueryOptions } from "./use-public-search";

afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
  onlineManager.setOnline(true);
});

describe("live public search queries", () => {
  it("keys every filter/coordinate and never persists search GPS or viewport", () => {
    const options = getPublicSearchQueryOptions(
      "  cafe ",
      { latitude: -1.59, longitude: -79 },
      { kind: "establishment", bounds: [-79.02, -1.62, -78.98, -1.58] },
    );
    expect(options.queryKey).toEqual([
      "public-search",
      "cafe",
      -1.59,
      -79,
      "establishment",
      [-79.02, -1.62, -78.98, -1.58],
    ]);
    expect(isPersistedQueryKey(options.queryKey)).toBe(false);
    expect(getPublicSearchQueryOptions("a").enabled).toBe(false);
    expect(
      getPublicSearchQueryOptions("cafe", null, { enabled: false }).enabled,
    ).toBe(false);
  });
  it("aborts the request when its last observer leaves", async () => {
    let signal: AbortSignal | null | undefined;
    const fetcher = vi.fn(
      (_url, init?: RequestInit) =>
        new Promise<Response>((_resolve, reject) => {
          signal = init?.signal;
          signal?.addEventListener(
            "abort",
            () => reject(new DOMException("Stopped", "AbortError")),
            { once: true },
          );
        }),
    );
    vi.stubGlobal("fetch", fetcher);
    vi.stubEnv("EXPO_PUBLIC_API_URL", "http://api.test/api/v1");
    const client = new QueryClient();
    const options = getPublicSearchQueryOptions("cafe");
    const observer = new QueryObserver(client, options);
    const unsubscribe = observer.subscribe(() => undefined);
    await vi.waitFor(() => expect(fetcher).toHaveBeenCalledTimes(1));
    unsubscribe();
    expect(signal?.aborted).toBe(true);
    expect(client.getQueryState(options.queryKey)?.error).toBeNull();
    client.clear();
  });
  it("pauses a remote query without connection instead of reporting a spinner forever", () => {
    onlineManager.setOnline(false);
    const client = new QueryClient();
    const observer = new QueryObserver(
      client,
      getPublicSearchQueryOptions("cafe"),
    );
    const unsubscribe = observer.subscribe(() => undefined);
    expect(observer.getCurrentResult().isPaused).toBe(true);
    expect(observer.getCurrentResult().isFetching).toBe(false);
    unsubscribe();
    client.clear();
  });
});
