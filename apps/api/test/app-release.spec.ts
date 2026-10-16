import { afterEach, describe, expect, it, vi } from "vitest";

import {
  AppReleaseService,
  compareVersions,
  parseReleaseVersion,
} from "../src/establishments/app-release.service";
import {
  formatReleaseDate,
  renderDownloadPage,
} from "../src/establishments/download-page";

afterEach(() => vi.unstubAllGlobals());

function githubRelease(tag: string) {
  return {
    ok: true,
    json: async () => ({
      tag_name: tag,
      published_at: "2026-10-17T03:30:00Z",
      body: " Novedades ",
    }),
  };
}

describe("app release", () => {
  it("reads the version from the release tag and compares versions", () => {
    expect(parseReleaseVersion("v1.0.3")).toBe("1.0.3");
    expect(parseReleaseVersion("1.2.10")).toBe("1.2.10");
    expect(parseReleaseVersion("beta")).toBeNull();
    expect(compareVersions("1.0.10", "1.0.9")).toBeGreaterThan(0);
    expect(compareVersions("1.0.3", "1.0.3")).toBe(0);
    expect(compareVersions("1.0.3", "1.1.0")).toBeLessThan(0);
  });

  it("caches the latest release and keeps it when GitHub fails", async () => {
    const fetchMock = vi.fn().mockResolvedValueOnce(githubRelease("v1.0.4"));
    vi.stubGlobal("fetch", fetchMock);
    const service = new AppReleaseService();

    await expect(service.latest()).resolves.toEqual({
      version: "1.0.4",
      publishedAt: "2026-10-17T03:30:00Z",
      notes: "Novedades",
    });
    await service.latest();
    expect(fetchMock).toHaveBeenCalledTimes(1);

    vi.useFakeTimers();
    vi.setSystemTime(Date.now() + 11 * 60 * 1000);
    fetchMock.mockRejectedValueOnce(new Error("offline"));
    await expect(service.latest()).resolves.toMatchObject({ version: "1.0.4" });
    vi.useRealTimers();
  });

  it("streams the APK from the latest release with its size", async () => {
    const body = new Response("apk-bytes").body;
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        body,
        headers: new Headers({ "content-length": "9" }),
      }),
    );
    const apk = await new AppReleaseService().openApk(
      new AbortController().signal,
    );

    expect(apk?.length).toBe("9");
    const chunks: Buffer[] = [];
    for await (const chunk of apk!.stream) chunks.push(chunk as Buffer);
    expect(Buffer.concat(chunks).toString()).toBe("apk-bytes");
  });

  it("returns null when the APK cannot be opened", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({ ok: false, body: null }),
    );
    await expect(
      new AppReleaseService().openApk(new AbortController().signal),
    ).resolves.toBeNull();
  });

  it("returns null when there is no release information", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("offline")));
    await expect(new AppReleaseService().latest()).resolves.toBeNull();
  });

  it("shows the version and launch date on the download page", () => {
    // 03:30 UTC es la noche anterior en Ecuador (UTC-5).
    expect(formatReleaseDate("2026-10-17T03:30:00Z")).toBe(
      "16 de octubre de 2026",
    );
    const html = renderDownloadPage({
      version: "1.0.4",
      publishedAt: "2026-10-17T03:30:00Z",
    });
    expect(html).toContain("Versión 1.0.4 · lanzada el 16 de octubre de 2026");
    expect(renderDownloadPage(null)).not.toContain("Versión");
  });
});
