import {
  Inject,
  Injectable,
  ServiceUnavailableException,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";

import {
  normalizeOfflineMapStyle,
  type OfflineMapStyle,
} from "../domain/offline-map-style";

export const OFFLINE_MAP_STYLE_FETCHER = Symbol("OFFLINE_MAP_STYLE_FETCHER");
export const OFFLINE_MAP_STYLE_CACHE_SECONDS = 30 * 60;
const maxStyleBytes = 2 * 1024 * 1024;
const requestTimeoutMilliseconds = 10_000;
const maxRedirects = 3;
const unavailableMessage =
  "El mapa para descargar no está disponible en este momento.";

@Injectable()
export class OfflineMapStyleService {
  private cached: Readonly<{
    url: string;
    expiresAt: number;
    style: OfflineMapStyle;
  }> | null = null;
  private pending: Readonly<{
    url: string;
    request: Promise<OfflineMapStyle>;
  }> | null = null;

  constructor(
    @Inject(ConfigService) private readonly config: ConfigService,
    @Inject(OFFLINE_MAP_STYLE_FETCHER) private readonly fetcher: typeof fetch,
  ) {}

  async getStyle(): Promise<OfflineMapStyle> {
    const source = this.config.get<string>("OFFLINE_MAP_STYLE_URL")?.trim();
    const url = getConfiguredUrl(source);
    if (!url) throw new ServiceUnavailableException(unavailableMessage);
    if (this.cached?.url === url && this.cached.expiresAt > Date.now()) {
      return this.cached.style;
    }
    if (this.pending?.url === url) return this.pending.request;

    const request = this.fetchStyle(url)
      .then((style) => {
        this.cached = {
          url,
          style,
          expiresAt: Date.now() + OFFLINE_MAP_STYLE_CACHE_SECONDS * 1000,
        };
        return style;
      })
      .finally(() => {
        if (this.pending?.request === request) this.pending = null;
      });
    this.pending = { url, request };
    return request;
  }

  private async fetchStyle(url: string): Promise<OfflineMapStyle> {
    const controller = new AbortController();
    const timeout = setTimeout(
      () => controller.abort(),
      requestTimeoutMilliseconds,
    );
    try {
      let target = new URL(url);
      for (let redirects = 0; redirects <= maxRedirects; redirects++) {
        const response = await this.fetcher(target, {
          headers: { Accept: "application/json" },
          redirect: "manual",
          signal: controller.signal,
        });
        if (response.status >= 300 && response.status < 400) {
          const location = response.headers.get("location");
          await response.body?.cancel();
          if (!location || redirects === maxRedirects)
            throw new Error("Invalid redirect");
          const redirected = new URL(location, target);
          // Deployment config is the only allowed destination; a remote response
          // cannot redirect this server to an arbitrary host or a new protocol.
          if (
            redirected.origin !== new URL(url).origin ||
            redirected.username ||
            redirected.password
          ) {
            throw new Error("Invalid redirect destination");
          }
          target = redirected;
          continue;
        }
        if (!response.ok) throw new Error("Unavailable upstream style");
        const value = await readLimitedJson(response);
        return normalizeOfflineMapStyle(value, target.toString());
      }
      throw new Error("Too many redirects");
    } catch {
      // Keep provider URLs, credentials and response details out of public errors.
      throw new ServiceUnavailableException(unavailableMessage);
    } finally {
      clearTimeout(timeout);
    }
  }
}

function getConfiguredUrl(value: string | undefined): string | null {
  if (!value) return null;
  try {
    const url = new URL(value);
    return ["http:", "https:"].includes(url.protocol) &&
      !url.username &&
      !url.password
      ? url.toString()
      : null;
  } catch {
    return null;
  }
}

async function readLimitedJson(response: Response): Promise<unknown> {
  if (Number(response.headers.get("content-length")) > maxStyleBytes) {
    await response.body?.cancel();
    throw new Error("Map style exceeds limit");
  }
  const reader = response.body?.getReader();
  if (!reader) throw new Error("Missing map style body");
  const chunks: Uint8Array[] = [];
  let size = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > maxStyleBytes) {
        await reader.cancel();
        throw new Error("Map style exceeds limit");
      }
      chunks.push(value);
    }
    return JSON.parse(Buffer.concat(chunks).toString("utf8")) as unknown;
  } finally {
    reader.releaseLock();
  }
}
