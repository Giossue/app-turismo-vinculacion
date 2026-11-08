import { Injectable } from "@nestjs/common";

import { APP_RELEASES_API_URL } from "./download-page";

/** APK adjunto a la release: el servidor lo copia para servirlo él mismo. */
export type AppReleaseApk = Readonly<{
  url: string;
  size: number;
  /** Huella SHA-256 en hexadecimal, cuando GitHub la publica. */
  sha256: string | null;
}>;

export type AppRelease = Readonly<{
  version: string;
  publishedAt: string;
  notes: string;
  apk?: AppReleaseApk;
}>;

export const APP_APK_ASSET_NAME = "rumbo-ec.apk";

/** Lee el APK adjunto de la respuesta de GitHub; `undefined` si falta o es raro. */
export function parseReleaseApk(assets: unknown): AppReleaseApk | undefined {
  if (!Array.isArray(assets)) return undefined;
  const asset = assets.find(
    (item: { name?: unknown }) => item?.name === APP_APK_ASSET_NAME,
  ) as
    | { browser_download_url?: unknown; size?: unknown; digest?: unknown }
    | undefined;
  if (
    !asset ||
    typeof asset.browser_download_url !== "string" ||
    !asset.browser_download_url.startsWith("https://github.com/") ||
    typeof asset.size !== "number" ||
    asset.size <= 0
  ) {
    return undefined;
  }
  const digest =
    typeof asset.digest === "string"
      ? /^sha256:([0-9a-f]{64})$/.exec(asset.digest)?.[1]
      : undefined;
  return {
    url: asset.browser_download_url,
    size: asset.size,
    sha256: digest ?? null,
  };
}

const CACHE_MS = 10 * 60 * 1000;
const REQUEST_TIMEOUT_MS = 5000;

/** Extrae la versión («1.0.3») de la etiqueta de la release («v1.0.3»). */
export function parseReleaseVersion(tag: unknown): string | null {
  if (typeof tag !== "string") return null;
  const match = /^v?(\d+\.\d+\.\d+)$/.exec(tag.trim());
  return match?.[1] ?? null;
}

/** Compara versiones `x.y.z`; devuelve un número positivo si `a` es más nueva. */
export function compareVersions(a: string, b: string): number {
  const left = a.split(".").map(Number);
  const right = b.split(".").map(Number);
  for (let i = 0; i < 3; i += 1) {
    const diff = (left[i] ?? 0) - (right[i] ?? 0);
    if (diff !== 0) return diff;
  }
  return 0;
}

/**
 * Última versión publicada de la app, leída de las releases del repositorio.
 * Se guarda en memoria unos minutos; si GitHub falla se conserva el último
 * valor conocido, y sin ninguno devuelve `null` (la página sigue funcionando).
 */
@Injectable()
export class AppReleaseService {
  private cached: { release: AppRelease; at: number } | null = null;
  private pending: Promise<AppRelease | null> | null = null;

  async latest(): Promise<AppRelease | null> {
    if (this.cached && Date.now() - this.cached.at < CACHE_MS) {
      return this.cached.release;
    }
    this.pending ??= this.fetchLatest().finally(() => {
      this.pending = null;
    });
    return (await this.pending) ?? this.cached?.release ?? null;
  }

  private async fetchLatest(): Promise<AppRelease | null> {
    try {
      const response = await fetch(APP_RELEASES_API_URL, {
        headers: { Accept: "application/vnd.github+json" },
        signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
      });
      if (!response.ok) return null;
      const body = (await response.json()) as {
        tag_name?: unknown;
        published_at?: unknown;
        body?: unknown;
        assets?: unknown;
      };
      const version = parseReleaseVersion(body.tag_name);
      if (!version || typeof body.published_at !== "string") return null;
      const apk = parseReleaseApk(body.assets);
      const release: AppRelease = {
        version,
        publishedAt: body.published_at,
        notes: typeof body.body === "string" ? body.body.trim() : "",
        ...(apk ? { apk } : {}),
      };
      this.cached = { release, at: Date.now() };
      return release;
    } catch {
      return null;
    }
  }
}
