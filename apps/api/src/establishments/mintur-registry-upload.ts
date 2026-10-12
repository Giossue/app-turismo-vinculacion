import { BadRequestException } from "@nestjs/common";
import type { FastifyRequest } from "fastify";

/** El consolidado nacional pesa unos 30 MB. */
export const REGISTRY_MAX_UPLOAD_BYTES = 80 * 1024 * 1024;

const ZIP_SIGNATURE = Buffer.from([0x50, 0x4b, 0x03, 0x04]);

export async function readRegistryUpload(request: FastifyRequest) {
  let part;
  try {
    part = await request.file({
      limits: {
        fileSize: REGISTRY_MAX_UPLOAD_BYTES,
        files: 1,
        fields: 0,
        parts: 1,
      },
    });
  } catch {
    throw new BadRequestException("El archivo supera el límite permitido.");
  }
  if (!part) throw new BadRequestException("Debes seleccionar un archivo.");
  let buffer: Buffer;
  try {
    buffer = await part.toBuffer();
  } catch {
    throw new BadRequestException("El archivo supera el límite permitido.");
  }
  if (part.file.truncated) {
    throw new BadRequestException("El archivo supera el límite permitido.");
  }
  // .xlsx y .xlsm son paquetes ZIP; se rechaza cualquier otro formato.
  if (
    !/\.xls[xm]$/i.test(part.filename) ||
    !buffer.subarray(0, 4).equals(ZIP_SIGNATURE)
  ) {
    throw new BadRequestException("Sube el consolidado en formato .xlsx.");
  }
  return { buffer, name: part.filename };
}
