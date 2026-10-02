import { ServiceUnavailableException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { afterEach, describe, expect, it, vi } from "vitest";

import { OfflineMapStyleService } from "./offline-map-style.service";

const upstreamUrl = "https://tiles.test/styles/basic/style.json";
const style = {
  version: 8,
  sources: { openmaptiles: { type: "vector", url: "/data/v3.json" } },
  layers: [],
};

function makeService(
  fetcher = vi.fn().mockResolvedValue(Response.json(style)),
  url: string | undefined = upstreamUrl,
) {
  return {
    fetcher,
    service: new OfflineMapStyleService(
      new ConfigService({ OFFLINE_MAP_STYLE_URL: url }),
      fetcher,
    ),
  };
}

afterEach(() => vi.useRealTimers());

describe("fixed offline style proxy", () => {
  it("serves a raw normalized style and reuses one fetch for concurrent renderer and pack requests", async () => {
    const { fetcher, service } = makeService();
    const [first, second] = await Promise.all([
      service.getStyle(),
      service.getStyle(),
    ]);
    expect(first).toBe(second);
    expect(first).not.toHaveProperty("data");
    expect(first.sources.openmaptiles).toMatchObject({
      url: "https://tiles.test/data/v3.json",
      maxzoom: 14,
    });
    await expect(service.getStyle()).resolves.toBe(first);
    expect(fetcher).toHaveBeenCalledTimes(1);
    expect(fetcher.mock.calls[0]?.[0]?.toString()).toBe(upstreamUrl);
    expect(fetcher.mock.calls[0]?.[1]).toMatchObject({
      redirect: "manual",
      headers: { Accept: "application/json" },
    });
  });

  it("refuses missing configuration, credentials and non-HTTP destinations without making requests", async () => {
    for (const url of [
      undefined,
      "",
      "file:///secret",
      "https://user:secret@tiles.test/style.json",
    ]) {
      const fetcher = vi.fn();
      const service = new OfflineMapStyleService(
        new ConfigService({ OFFLINE_MAP_STYLE_URL: url }),
        fetcher,
      );
      await expect(service.getStyle()).rejects.toThrow(
        ServiceUnavailableException,
      );
      expect(fetcher).not.toHaveBeenCalled();
    }
  });

  it("resolves same-origin redirects and rejects redirects to other origins", async () => {
    const fetcher = vi
      .fn()
      .mockResolvedValueOnce(
        new Response(null, {
          status: 302,
          headers: { location: "./current/style.json" },
        }),
      )
      .mockResolvedValueOnce(Response.json({ ...style, sprite: "./sprite" }));
    const { service } = makeService(fetcher);
    expect((await service.getStyle()).sprite).toBe(
      "https://tiles.test/styles/basic/current/sprite",
    );
    expect(fetcher.mock.calls[1]?.[0]?.toString()).toBe(
      "https://tiles.test/styles/basic/current/style.json",
    );

    const other = makeService(
      vi.fn().mockResolvedValue(
        new Response(null, {
          status: 302,
          headers: { location: "http://127.0.0.1/internal" },
        }),
      ),
    );
    await expect(other.service.getStyle()).rejects.toThrow(
      ServiceUnavailableException,
    );
    expect(other.fetcher).toHaveBeenCalledTimes(1);
  });

  it("caps redirects and reports a generic public error", async () => {
    const { fetcher, service } = makeService(
      vi.fn().mockImplementation(() =>
        Promise.resolve(
          new Response(null, {
            status: 302,
            headers: { location: "./style.json" },
          }),
        ),
      ),
    );
    await expect(service.getStyle()).rejects.toThrow(
      "El mapa para descargar no está disponible en este momento.",
    );
    expect(fetcher).toHaveBeenCalledTimes(4);
  });

  it("caps both declared response size and streamed bytes", async () => {
    const declared = makeService(
      vi.fn().mockResolvedValue(
        new Response("{}", {
          headers: { "content-length": String(2 * 1024 * 1024 + 1) },
        }),
      ),
    );
    await expect(declared.service.getStyle()).rejects.toThrow(
      ServiceUnavailableException,
    );

    const bytes = new Uint8Array(2 * 1024 * 1024 + 1);
    const stream = new ReadableStream<Uint8Array>({
      start(controller) {
        controller.enqueue(bytes);
        controller.close();
      },
    });
    const streamed = makeService(
      vi.fn().mockResolvedValue(new Response(stream)),
    );
    await expect(streamed.service.getStyle()).rejects.toThrow(
      ServiceUnavailableException,
    );
  });

  it("does not cache corrupt data or expose upstream details in failures", async () => {
    const fetcher = vi
      .fn()
      .mockRejectedValueOnce(new Error("private provider credentials"))
      .mockResolvedValueOnce(new Response("not JSON"))
      .mockResolvedValueOnce(Response.json(style));
    const { service } = makeService(fetcher);
    await expect(service.getStyle()).rejects.toThrow(
      "El mapa para descargar no está disponible en este momento.",
    );
    await expect(service.getStyle()).rejects.toThrow(
      ServiceUnavailableException,
    );
    await expect(service.getStyle()).resolves.toMatchObject({ version: 8 });
    expect(fetcher).toHaveBeenCalledTimes(3);
  });

  it("aborts a slow provider at the ten-second deadline", async () => {
    vi.useFakeTimers();
    const fetcher = vi.fn().mockImplementation(
      (_url, options: RequestInit) =>
        new Promise((_resolve, reject) => {
          options.signal?.addEventListener(
            "abort",
            () => reject(new Error("request aborted")),
            { once: true },
          );
        }),
    );
    const { service } = makeService(fetcher);
    const request = service.getStyle();
    const rejection = expect(request).rejects.toThrow(
      ServiceUnavailableException,
    );
    await vi.advanceTimersByTimeAsync(10_000);
    await rejection;
    expect(fetcher.mock.calls[0]?.[1]?.signal?.aborted).toBe(true);
  });

  it("refreshes after thirty minutes while keeping the download resources stable within the cache", async () => {
    vi.useFakeTimers();
    const fetcher = vi
      .fn()
      .mockImplementation(() => Promise.resolve(Response.json(style)));
    const { service } = makeService(fetcher);
    const first = await service.getStyle();
    await vi.advanceTimersByTimeAsync(29 * 60_000);
    await expect(service.getStyle()).resolves.toBe(first);
    await vi.advanceTimersByTimeAsync(61_000);
    await service.getStyle();
    expect(fetcher).toHaveBeenCalledTimes(2);
  });
});
