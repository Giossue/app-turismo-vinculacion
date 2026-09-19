import { describe, expect, it, vi } from "vitest";

import { MediaService } from "../src/files/media.service";

describe("MediaService", () => {
  it("rejects an image whose MIME does not match its content signature", async () => {
    const transaction = vi.fn();
    const service = new MediaService(
      { transaction } as never,
      { put: vi.fn(), remove: vi.fn(), get: vi.fn() } as never,
      {
        getOrThrow: vi.fn((key: string) =>
          key === "MEDIA_MAX_IMAGE_BYTES"
            ? 10 * 1024 * 1024
            : key === "MEDIA_MAX_UPLOAD_BYTES"
              ? 50 * 1024 * 1024
            : key === "MEDIA_STORAGE_PROVIDER"
              ? "LOCAL"
              : undefined,
        ),
      } as never,
    );

    await expect(
      service.upload(9, "EC-TEST", {
        originalName: "foto.png",
        mimeType: "image/png",
        buffer: Buffer.from("not-an-image"),
      }),
    ).rejects.toThrow(
      "Solo se aceptan imágenes, videos MP4/WebM y audios MP3/WAV/OGG válidos.",
    );
    expect(transaction).not.toHaveBeenCalled();
  });

  it("rejects files over the configured limit before opening a transaction", async () => {
    const transaction = vi.fn();
    const service = new MediaService(
      { transaction } as never,
      { put: vi.fn(), remove: vi.fn(), get: vi.fn() } as never,
      { getOrThrow: vi.fn().mockReturnValue(1024) } as never,
    );

    await expect(
      service.upload(9, "EC-TEST", {
        originalName: "foto.jpg",
        mimeType: "image/jpeg",
        buffer: Buffer.alloc(1025, 0xff),
      }),
    ).rejects.toThrow("debe pesar");
    expect(transaction).not.toHaveBeenCalled();
  });
});
