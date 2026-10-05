import sharp from "sharp";
import { describe, expect, it } from "vitest";

import { optimizePhoto } from "../src/files/media-image";

function image(width: number, height: number, format: "png" | "jpeg") {
  return sharp({
    create: { width, height, channels: 3, background: "#1565c0" },
  })
    [format]()
    .toBuffer();
}

describe("optimizePhoto", () => {
  it("recorta a 4:3, limita a 1600 px y convierte a WebP", async () => {
    const result = await optimizePhoto(await image(4000, 2000, "jpeg"));
    const metadata = await sharp(result.buffer).metadata();

    expect(result.mimeType).toBe("image/webp");
    expect(metadata.format).toBe("webp");
    expect([metadata.width, metadata.height]).toEqual([1600, 1200]);
  });

  it("no amplía imágenes pequeñas, solo las recorta", async () => {
    const result = await optimizePhoto(await image(400, 600, "png"));
    const metadata = await sharp(result.buffer).metadata();

    expect([metadata.width, metadata.height]).toEqual([400, 300]);
  });

  it("rechaza contenido que no es una imagen", async () => {
    await expect(optimizePhoto(Buffer.from("no-es-imagen"))).rejects.toThrow(
      "No se pudo procesar la fotografía",
    );
  });
});
