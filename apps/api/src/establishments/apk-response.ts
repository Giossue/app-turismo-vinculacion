import { createReadStream } from "node:fs";
import type { FastifyReply, FastifyRequest } from "fastify";

import type { MirroredApk } from "./app-apk-mirror.service";

export type ByteRange = Readonly<{ start: number; end: number }>;

/**
 * Interpreta una cabecera `Range` de un solo tramo. Devuelve `null` si no hay
 * cabecera (o pide varios tramos: se responde el archivo entero) y `"invalid"`
 * si el tramo cae fuera del archivo.
 */
export function parseByteRange(
  header: string | undefined,
  size: number,
): ByteRange | "invalid" | null {
  if (!header) return null;
  const match = /^bytes=(\d*)-(\d*)$/.exec(header.trim());
  if (!match) return null;
  const [, from, to] = match;
  if (from === "" && to === "") return "invalid";
  if (from === "") {
    const suffix = Number(to);
    if (suffix === 0) return "invalid";
    return { start: Math.max(size - suffix, 0), end: size - 1 };
  }
  const start = Number(from);
  const end = to === "" ? size - 1 : Math.min(Number(to), size - 1);
  if (start >= size || end < start) return "invalid";
  return { start, end };
}

/** Entrega el APK copiado; admite `Range` para reanudar descargas cortadas. */
export function sendApk(
  request: FastifyRequest,
  response: FastifyReply,
  apk: MirroredApk,
) {
  const etag = `"${apk.version}-${apk.size}"`;
  // Si el APK cambió entre dos intentos, el tramo pedido ya no sirve.
  const ifRange = request.headers["if-range"];
  const range =
    ifRange && ifRange !== etag
      ? null
      : parseByteRange(request.headers.range, apk.size);
  response
    .header("Content-Type", "application/vnd.android.package-archive")
    .header("Content-Disposition", 'attachment; filename="wasi-travel.apk"')
    .header("Cache-Control", "no-cache")
    .header("Accept-Ranges", "bytes")
    .header("ETag", etag);
  if (range === "invalid") {
    return response
      .status(416)
      .header("Content-Range", `bytes */${apk.size}`)
      .send();
  }
  const { start, end } = range ?? { start: 0, end: apk.size - 1 };
  if (range) {
    response
      .status(206)
      .header("Content-Range", `bytes ${start}-${end}/${apk.size}`);
  }
  return response
    .header("Content-Length", end - start + 1)
    .send(createReadStream(apk.path, { start, end }));
}
