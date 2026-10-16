import { Injectable } from "@nestjs/common";
import { Readable } from "node:stream";

import { APP_DOWNLOAD_URL, APP_RELEASES_API_URL } from "./download-page";

export type AppRelease = Readonly<{
  version: string;
  publishedAt: string;
  notes: string;
}>;

const CACHE_MS = 10 * 60 * 1000;
const REQUEST_TIMEOUT_MS = 5000;
const APK_HEADERS_TIMEOUT_MS = 15000;

export type AppApk = Readonly<{ stream: Readable; length: string | null }>;

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

  /**
   * Abre el APK de la última release para entregarlo desde nuestro dominio,
   * sin redirigir al visitante a GitHub. El plazo solo cubre la conexión; el
   * cuerpo se transmite hasta que termine o el visitante cancele (`signal`).
   */
  async openApk(signal: AbortSignal): Promise<AppApk | null> {
    const upstream = new AbortController();
    const abort = () => upstream.abort();
    signal.addEventListener("abort", abort, { once: true });
    const timer = setTimeout(abort, APK_HEADERS_TIMEOUT_MS);
    try {
      const response = await fetch(APP_DOWNLOAD_URL, {
        signal: upstream.signal,
      });
      if (!response.ok || !response.body) {
        upstream.abort();
        return null;
      }
      return {
        stream: Readable.fromWeb(response.body as never),
        length: response.headers.get("content-length"),
      };
    } catch {
      return null;
    } finally {
      clearTimeout(timer);
    }
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
      };
      const version = parseReleaseVersion(body.tag_name);
      if (!version || typeof body.published_at !== "string") return null;
      const release = {
        version,
        publishedAt: body.published_at,
        notes: typeof body.body === "string" ? body.body.trim() : "",
      };
      this.cached = { release, at: Date.now() };
      return release;
    } catch {
      return null;
    }
  }
}
