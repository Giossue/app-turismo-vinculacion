import {
  Inject,
  Injectable,
  Logger,
  type OnApplicationBootstrap,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { createHash } from "node:crypto";
import { createWriteStream } from "node:fs";
import { mkdir, readdir, rename, stat, unlink } from "node:fs/promises";
import { isAbsolute, join, resolve } from "node:path";
import { Readable, Transform } from "node:stream";
import { pipeline } from "node:stream/promises";
import type { ReadableStream } from "node:stream/web";

import { AppReleaseService, type AppRelease } from "./app-release.service";

const DOWNLOAD_TIMEOUT_MS = 15 * 60 * 1000;
/** Tras un fallo no se reintenta enseguida: cada intento baja el APK entero. */
const RETRY_AFTER_MS = 10 * 60 * 1000;
const FILE_PATTERN = /^rumbo-ec-\d+\.\d+\.\d+\.apk(\.part)?$/;

export type MirroredApk = Readonly<{
  path: string;
  size: number;
  version: string;
}>;

async function fileSize(path: string): Promise<number | null> {
  try {
    return (await stat(path)).size;
  } catch {
    return null;
  }
}

/**
 * Copia en el volumen del servidor el APK de la última release de GitHub, para
 * que `/descargar/rumbo-ec.apk` lo entregue sin pasar por GitHub. Publicar una
 * release basta: la copia empieza sola en cuanto la API ve la versión nueva, y
 * mientras no esté completa y verificada la descarga sigue yendo a GitHub.
 */
@Injectable()
export class AppApkMirrorService implements OnApplicationBootstrap {
  private readonly logger = new Logger(AppApkMirrorService.name);
  private readonly dir: string;
  private syncing: Promise<void> | null = null;
  private failure: { version: string; at: number } | null = null;

  constructor(
    @Inject(ConfigService) config: ConfigService,
    @Inject(AppReleaseService) private readonly releases: AppReleaseService,
  ) {
    const root = config.getOrThrow<string>("MEDIA_STORAGE_ROOT");
    this.dir = join(
      isAbsolute(root) ? root : resolve(process.cwd(), root),
      "app-releases",
    );
  }

  onApplicationBootstrap() {
    // Tras un despliegue la copia queda lista antes de la primera descarga.
    if (process.env.NODE_ENV !== "test") void this.current();
  }

  /** APK local de la última versión, o `null` si aún no está copiado. */
  async current(): Promise<MirroredApk | null> {
    const release = await this.releases.latest();
    if (!release?.apk) return null;
    const path = join(this.dir, `rumbo-ec-${release.version}.apk`);
    if ((await fileSize(path)) === release.apk.size) {
      return { path, size: release.apk.size, version: release.version };
    }
    const failedRecently =
      this.failure?.version === release.version &&
      Date.now() - this.failure.at < RETRY_AFTER_MS;
    if (failedRecently) return null;
    this.syncing ??= this.download(release, path)
      .catch((error: unknown) => {
        this.failure = { version: release.version, at: Date.now() };
        this.logger.warn(
          `No se pudo copiar el APK ${release.version}: ${String(error)}`,
        );
      })
      .finally(() => {
        this.syncing = null;
      });
    return null;
  }

  /** Espera la copia en curso; solo lo usan las pruebas. */
  async idle(): Promise<void> {
    await this.syncing;
  }

  private async download(release: AppRelease, path: string): Promise<void> {
    const apk = release.apk!;
    await mkdir(this.dir, { recursive: true, mode: 0o750 });
    const part = `${path}.part`;
    try {
      const response = await fetch(apk.url, {
        signal: AbortSignal.timeout(DOWNLOAD_TIMEOUT_MS),
      });
      if (!response.ok || !response.body) {
        throw new Error(`GitHub respondió ${response.status}`);
      }
      const hash = createHash("sha256");
      await pipeline(
        Readable.fromWeb(response.body as ReadableStream<Uint8Array>),
        new Transform({
          transform(chunk: Buffer, _encoding, callback) {
            hash.update(chunk);
            callback(null, chunk);
          },
        }),
        createWriteStream(part, { mode: 0o640 }),
      );
      const size = await fileSize(part);
      if (size !== apk.size) {
        throw new Error(`tamaño ${size}, se esperaba ${apk.size}`);
      }
      const digest = hash.digest("hex");
      if (apk.sha256 && digest !== apk.sha256) {
        throw new Error("la huella SHA-256 no coincide");
      }
      // El renombrado es atómico: nunca se sirve un APK a medias.
      await rename(part, path);
    } catch (error) {
      await unlink(part).catch(() => undefined);
      throw error;
    }
    this.logger.log(`APK ${release.version} copiado al servidor`);
    await this.removeOthers(path);
  }

  private async removeOthers(keep: string): Promise<void> {
    for (const name of await readdir(this.dir)) {
      const path = join(this.dir, name);
      if (path !== keep && FILE_PATTERN.test(name)) {
        await unlink(path).catch(() => undefined);
      }
    }
  }
}
