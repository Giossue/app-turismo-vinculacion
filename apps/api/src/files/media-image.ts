import { BadRequestException } from "@nestjs/common";
import sharp, { type Metadata } from "sharp";

/** Formatos que se aceptan al subir una fotografía; se almacenan siempre como WebP. */
export const PHOTO_UPLOAD_TYPES: ReadonlySet<string> = new Set([
  "image/jpeg",
  "image/png",
]);

/** Encuadre 4:3 usado por las tarjetas y galerías del panel y la app. */
export const PHOTO_WIDTH = 1600;
export const PHOTO_HEIGHT = 1200;
const PHOTO_QUALITY = 80;

export type OptimizedPhoto = {
  buffer: Buffer;
  mimeType: "image/webp";
  extension: ".webp";
};

/**
 * Normaliza una fotografía: respeta la orientación EXIF, recorta al encuadre
 * 4:3 conservando la zona de mayor interés, no amplía imágenes pequeñas y la
 * convierte a WebP sin metadatos (ubicación GPS, cámara, etc.).
 */
export async function optimizePhoto(input: Buffer): Promise<OptimizedPhoto> {
  try {
    const image = sharp(input, { failOn: "error" }).rotate();
    const metadata = await image.metadata();
    const { width = 0, height = 0 } = metadata;
    const orientedWidth = needsSwap(metadata) ? height : width;
    const orientedHeight = needsSwap(metadata) ? width : height;
    // El mayor 4:3 que cabe en la imagen, sin superar el máximo ni ampliar.
    const targetWidth = Math.min(
      PHOTO_WIDTH,
      orientedWidth,
      Math.floor((orientedHeight * PHOTO_WIDTH) / PHOTO_HEIGHT),
    );
    const targetHeight = Math.round((targetWidth * PHOTO_HEIGHT) / PHOTO_WIDTH);
    if (targetWidth < 1 || targetHeight < 1) throw new Error("Imagen vacía");
    const buffer = await image
      .resize(targetWidth, targetHeight, {
        fit: "cover",
        position: sharp.strategy.attention,
      })
      .webp({ quality: PHOTO_QUALITY })
      .toBuffer();
    return { buffer, mimeType: "image/webp", extension: ".webp" };
  } catch {
    throw new BadRequestException(
      "No se pudo procesar la fotografía. Verifica que sea un JPEG o PNG válido.",
    );
  }
}

/** Orientaciones EXIF 5–8 giran 90°: ancho y alto quedan intercambiados. */
function needsSwap(metadata: Metadata): boolean {
  return (metadata.orientation ?? 1) >= 5;
}
