import { createHash } from "node:crypto";
import sharp from "sharp";

export type MediaImageSize = "thumbnail" | "preview";
type MediaFile = Readonly<{ body: Buffer | Uint8Array; mimeType: string }>;
type CachedVariant = Readonly<{ file: MediaFile; expiresAt: number }>;
const variants = new Map<string, CachedVariant>();
const pending = new Map<string, Promise<MediaFile>>();
const maxBytes = 16 * 1024 * 1024;
const maxEntries = 128;
const lifetimeMs = 60 * 60_000;
const maxConcurrent = 2;
let retainedBytes = 0;

/** Se invoca después de verificar publicación; nunca almacena permisos ni IDs. */
export async function createMediaVariant(
  file: MediaFile,
  size?: MediaImageSize,
): Promise<MediaFile> {
  if (
    !size ||
    !["image/webp", "image/jpeg", "image/png"].includes(file.mimeType)
  )
    return file;
  const now = Date.now();
  for (const [key, value] of variants)
    if (value.expiresAt <= now) removeVariant(key);
  const key = `${size}:${createHash("sha256").update(file.body).digest("hex")}`;
  const cached = variants.get(key);
  if (cached) {
    variants.delete(key);
    variants.set(key, cached);
    return cached.file;
  }
  const running = pending.get(key);
  if (running) return running;
  // Sin cola ilimitada: bajo carga el original sigue siendo válido.
  if (pending.size >= maxConcurrent) return file;
  const task = resize(file, size)
    .then((result) => {
      const bytes = result.body.byteLength;
      if (result !== file && bytes <= maxBytes) {
        while (variants.size >= maxEntries || retainedBytes + bytes > maxBytes)
          removeVariant(variants.keys().next().value!);
        variants.set(key, { file: result, expiresAt: Date.now() + lifetimeMs });
        retainedBytes += bytes;
      }
      return result;
    })
    .finally(() => pending.delete(key));
  pending.set(key, task);
  return task;
}

async function resize(
  file: MediaFile,
  size: MediaImageSize,
): Promise<MediaFile> {
  try {
    const body = await sharp(file.body, {
      failOn: "error",
      limitInputPixels: 40_000_000,
    })
      .rotate()
      .resize({
        width: size === "thumbnail" ? 640 : 1280,
        withoutEnlargement: true,
      })
      .webp({ quality: size === "thumbnail" ? 75 : 80 })
      .toBuffer();
    return { body, mimeType: "image/webp" };
  } catch {
    return file;
  }
}

function removeVariant(key: string): void {
  const entry = variants.get(key);
  if (entry) retainedBytes -= entry.file.body.byteLength;
  variants.delete(key);
}
