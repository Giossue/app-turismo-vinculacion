import { createHash } from "node:crypto";
import { mkdtemp, readdir, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type { ConfigService } from "@nestjs/config";
import Fastify from "fastify";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  AppApkMirrorService,
  type MirroredApk,
} from "../src/establishments/app-apk-mirror.service";
import {
  parseReleaseApk,
  type AppRelease,
  type AppReleaseService,
} from "../src/establishments/app-release.service";
import { parseByteRange, sendApk } from "../src/establishments/apk-response";

const APK = Buffer.from("contenido-del-apk-de-prueba");
const SHA = createHash("sha256").update(APK).digest("hex");
const URL = "https://github.com/x/y/releases/download/v1.0.14/rumbo-ec.apk";

let root: string;
beforeEach(async () => {
  root = await mkdtemp(join(tmpdir(), "apk-mirror-"));
});
afterEach(async () => {
  vi.unstubAllGlobals();
  await rm(root, { force: true, recursive: true });
});

function mirrorFor(release: AppRelease | null) {
  const config = { getOrThrow: () => root } as unknown as ConfigService;
  const releases = {
    latest: async () => release,
  } as unknown as AppReleaseService;
  return new AppApkMirrorService(config, releases);
}

function release(sha256: string | null = SHA): AppRelease {
  return {
    version: "1.0.14",
    publishedAt: "2026-11-08T00:00:00Z",
    notes: "",
    apk: { url: URL, size: APK.length, sha256 },
  };
}

describe("parseReleaseApk", () => {
  it("reads the APK asset with its size and SHA-256", () => {
    expect(
      parseReleaseApk([
        { name: "otro.zip", size: 1, browser_download_url: URL },
        {
          name: "rumbo-ec.apk",
          size: 42,
          browser_download_url: URL,
          digest: `sha256:${SHA}`,
        },
      ]),
    ).toEqual({ url: URL, size: 42, sha256: SHA });
  });

  it("ignores missing assets and URLs outside GitHub", () => {
    expect(parseReleaseApk(undefined)).toBeUndefined();
    expect(
      parseReleaseApk([
        {
          name: "rumbo-ec.apk",
          size: 42,
          browser_download_url: "https://x.y/a",
        },
      ]),
    ).toBeUndefined();
    expect(
      parseReleaseApk([
        { name: "rumbo-ec.apk", size: 42, browser_download_url: URL },
      ]),
    ).toEqual({ url: URL, size: 42, sha256: null });
  });
});

describe("AppApkMirrorService", () => {
  it("copies the release APK, then serves it and removes older copies", async () => {
    await writeFile(join(root, "keep.txt"), "x");
    const fetchMock = vi.fn().mockResolvedValue(new Response(APK));
    vi.stubGlobal("fetch", fetchMock);
    const mirror = mirrorFor(release());
    await (await import("node:fs/promises")).mkdir(join(root, "app-releases"));
    await writeFile(join(root, "app-releases", "rumbo-ec-1.0.13.apk"), "old");

    await expect(mirror.current()).resolves.toBeNull();
    await mirror.idle();
    const ready = await mirror.current();

    expect(ready).toEqual({
      path: join(root, "app-releases", "rumbo-ec-1.0.14.apk"),
      size: APK.length,
      version: "1.0.14",
    });
    expect(await readFile(ready!.path)).toEqual(APK);
    expect(await readdir(join(root, "app-releases"))).toEqual([
      "rumbo-ec-1.0.14.apk",
    ]);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("discards a tampered download and waits before retrying", async () => {
    const tampered = Buffer.alloc(APK.length, "x");
    const fetchMock = vi
      .fn()
      .mockImplementation(async () => new Response(tampered));
    vi.stubGlobal("fetch", fetchMock);
    const mirror = mirrorFor(release());
    await mirror.current();
    await mirror.idle();

    await expect(mirror.current()).resolves.toBeNull();
    await mirror.idle();
    expect(await readdir(join(root, "app-releases"))).toEqual([]);
    expect(fetchMock).toHaveBeenCalledTimes(1);

    vi.useFakeTimers();
    vi.setSystemTime(Date.now() + 11 * 60 * 1000);
    await mirror.current();
    vi.useRealTimers();
    await mirror.idle();
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("keeps redirecting when the release has no APK", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    const withoutApk: AppRelease = { ...release(), apk: undefined };
    await expect(mirrorFor(withoutApk).current()).resolves.toBeNull();
    await expect(mirrorFor(null).current()).resolves.toBeNull();
    expect(fetchMock).not.toHaveBeenCalled();
  });
});

describe("parseByteRange", () => {
  it("reads single ranges and rejects ranges outside the file", () => {
    expect(parseByteRange(undefined, 10)).toBeNull();
    expect(parseByteRange("bytes=2-5", 10)).toEqual({ start: 2, end: 5 });
    expect(parseByteRange("bytes=4-", 10)).toEqual({ start: 4, end: 9 });
    expect(parseByteRange("bytes=-3", 10)).toEqual({ start: 7, end: 9 });
    expect(parseByteRange("bytes=8-99", 10)).toEqual({ start: 8, end: 9 });
    expect(parseByteRange("bytes=10-", 10)).toBe("invalid");
    expect(parseByteRange("bytes=0-1,4-5", 10)).toBeNull();
  });
});

describe("sendApk", () => {
  async function serve(apk: MirroredApk) {
    const app = Fastify();
    app.get("/apk", (request, reply) => sendApk(request, reply, apk));
    await app.ready();
    return app;
  }

  it("serves the whole APK and resumes from a range", async () => {
    const path = join(root, "a.apk");
    await writeFile(path, APK);
    const app = await serve({ path, size: APK.length, version: "1.0.14" });

    const full = await app.inject({ method: "GET", url: "/apk" });
    expect(full.statusCode).toBe(200);
    expect(full.rawPayload).toEqual(APK);
    expect(full.headers["content-type"]).toBe(
      "application/vnd.android.package-archive",
    );
    expect(full.headers["accept-ranges"]).toBe("bytes");

    const part = await app.inject({
      method: "GET",
      url: "/apk",
      headers: { range: "bytes=5-" },
    });
    expect(part.statusCode).toBe(206);
    expect(part.headers["content-range"]).toBe(
      `bytes 5-${APK.length - 1}/${APK.length}`,
    );
    expect(part.rawPayload).toEqual(APK.subarray(5));

    const stale = await app.inject({
      method: "GET",
      url: "/apk",
      headers: { range: "bytes=5-", "if-range": '"1.0.13-10"' },
    });
    expect(stale.statusCode).toBe(200);
    expect(stale.rawPayload).toEqual(APK);

    const outside = await app.inject({
      method: "GET",
      url: "/apk",
      headers: { range: `bytes=${APK.length}-` },
    });
    expect(outside.statusCode).toBe(416);
    await app.close();
  });
});
