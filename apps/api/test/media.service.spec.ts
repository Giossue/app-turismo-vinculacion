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

  it("stores a PDF as a typed institutional annex", async () => {
    const storage = { put: vi.fn(), remove: vi.fn(), get: vi.fn() };
    const managerQuery = vi.fn(async (sql: string) => {
      if (
        sql.includes("FROM centros_turisticos") &&
        sql.includes("FOR UPDATE")
      ) {
        return [{ id: "10" }];
      }
      if (sql.includes("FROM centros_turisticos")) return [{ id: "10" }];
      if (sql.includes("FROM tipos_archivo_centro_turistico")) {
        return [{ id: "3" }];
      }
      if (sql.includes("MAX(orden)")) return [{ next: 1 }];
      if (sql.includes("RETURNING id")) return [{ id: "20" }];
      return [];
    });
    const transaction = vi.fn(async (callback: (manager: unknown) => unknown) =>
      callback({ query: managerQuery }),
    );
    const service = new MediaService(
      { transaction } as never,
      storage as never,
      {
        getOrThrow: vi.fn((key: string) => {
          if (key === "MEDIA_MAX_IMAGE_BYTES") return 10 * 1024 * 1024;
          if (key === "MEDIA_MAX_UPLOAD_BYTES") return 50 * 1024 * 1024;
          if (key === "MEDIA_STORAGE_PROVIDER") return "LOCAL";
          throw new Error(`unexpected config ${key}`);
        }),
      } as never,
    );

    await expect(
      service.upload(9, "EC-TEST", {
        originalName: "plan.pdf",
        mimeType: "application/pdf",
        typeCode: "PLAN_CONTINGENCIA",
        buffer: Buffer.from("%PDF-1.7\ncontenido"),
      }),
    ).resolves.toMatchObject({
      id: 20,
      typeCode: "PLAN_CONTINGENCIA",
      state: "PENDIENTE",
    });
    expect(storage.put).toHaveBeenCalledWith(
      expect.stringContaining("/documents/"),
      expect.any(Buffer),
      "application/pdf",
    );
    expect(managerQuery).toHaveBeenCalledWith(
      expect.stringContaining("INSERT INTO archivos_centro_turistico"),
      expect.arrayContaining(["3", "plan.pdf"]),
    );
  });
});
