import { BadRequestException } from "@nestjs/common";

/**
 * Reglas compartidas por la multimedia de fichas y de establecimientos: tipos
 * MIME aceptados, firma binaria, límites de tamaño y metadatos de texto.
 */
export type MediaKind = "image" | "video" | "audio" | "document";

export const MEDIA_TYPES: ReadonlyMap<
  string,
  Readonly<{ kind: MediaKind; extension: string }>
> = new Map([
  ["image/jpeg", { kind: "image", extension: ".jpg" }],
  ["image/png", { kind: "image", extension: ".png" }],
  ["image/webp", { kind: "image", extension: ".webp" }],
  ["video/mp4", { kind: "video", extension: ".mp4" }],
  ["video/webm", { kind: "video", extension: ".webm" }],
  ["audio/mpeg", { kind: "audio", extension: ".mp3" }],
  ["audio/mp4", { kind: "audio", extension: ".m4a" }],
  ["audio/wav", { kind: "audio", extension: ".wav" }],
  ["audio/ogg", { kind: "audio", extension: ".ogg" }],
  ["application/pdf", { kind: "document", extension: ".pdf" }],
]);

export function assertUploadSize(buffer: Buffer, maxBytes: number) {
  if (buffer.length === 0 || buffer.length > maxBytes) {
    throw new BadRequestException(
      `El archivo debe pesar entre 1 byte y ${Math.floor(maxBytes / (1024 * 1024))} MB.`,
    );
  }
}

export function assertImageSize(buffer: Buffer, maxImageBytes: number) {
  if (buffer.length > maxImageBytes) {
    throw new BadRequestException(
      `La imagen debe pesar como máximo ${Math.floor(maxImageBytes / (1024 * 1024))} MB.`,
    );
  }
}

/** Descripción y fuente/autor recortadas, con los mismos límites que la base. */
export function mediaMetadata(input: {
  originalName: string;
  description?: string;
  sourceAuthor?: string;
}) {
  const description = input.description?.trim() || null;
  const sourceAuthor = input.sourceAuthor?.trim() || null;
  if (description && description.length > 2000) {
    throw new BadRequestException(
      "La descripción del archivo es demasiado larga.",
    );
  }
  if (sourceAuthor && sourceAuthor.length > 250) {
    throw new BadRequestException(
      "La fuente o autor del archivo es demasiado larga.",
    );
  }
  return {
    originalName: sanitizeOriginalName(input.originalName),
    description,
    sourceAuthor,
  };
}

export function sanitizeOriginalName(value: string): string {
  const normalized = value.replace(/[\\/\u0000-\u001f\u007f]/g, "_").trim();
  return normalized.slice(0, 255) || "fotografia";
}

export function hasMediaSignature(buffer: Buffer, mimeType: string): boolean {
  if (mimeType === "image/jpeg")
    return buffer.subarray(0, 3).equals(Buffer.from([0xff, 0xd8, 0xff]));
  if (mimeType === "image/png")
    return buffer
      .subarray(0, 8)
      .equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]));
  if (mimeType === "image/webp") {
    return (
      buffer.subarray(0, 4).toString("ascii") === "RIFF" &&
      buffer.subarray(8, 12).toString("ascii") === "WEBP"
    );
  }
  if (mimeType === "video/mp4" || mimeType === "audio/mp4") {
    return buffer.subarray(4, 8).toString("ascii") === "ftyp";
  }
  if (mimeType === "video/webm") {
    return buffer.subarray(0, 4).equals(Buffer.from([0x1a, 0x45, 0xdf, 0xa3]));
  }
  if (mimeType === "audio/mpeg") {
    return (
      buffer.subarray(0, 3).toString("ascii") === "ID3" ||
      (buffer[0] === 0xff && (buffer[1] & 0xe0) === 0xe0)
    );
  }
  if (mimeType === "audio/wav") {
    return (
      buffer.subarray(0, 4).toString("ascii") === "RIFF" &&
      buffer.subarray(8, 12).toString("ascii") === "WAVE"
    );
  }
  if (mimeType === "application/pdf") {
    return buffer.subarray(0, 5).toString("ascii") === "%PDF-";
  }
  return buffer.subarray(0, 4).toString("ascii") === "OggS";
}
