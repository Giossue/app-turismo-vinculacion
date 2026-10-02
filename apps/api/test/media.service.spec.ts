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

  it("rejects uploads to a deleted center before writing an object", async () => {
    const query = vi.fn().mockResolvedValue([]);
    const storage = { put: vi.fn(), remove: vi.fn() };
    const transaction = vi.fn(async (callback: (manager: unknown) => unknown) =>
      callback({ query }),
    );
    const service = new MediaService(
      { transaction } as never,
      storage as never,
      { getOrThrow: vi.fn().mockReturnValue(1024) } as never,
    );

    await expect(
      service.upload(7, "EC-001", {
        originalName: "plan.pdf",
        mimeType: "application/pdf",
        typeCode: "PLAN_CONTINGENCIA",
        buffer: Buffer.from("%PDF-1.7\ncontenido"),
      }),
    ).rejects.toThrow("No se encontró la ficha turística.");
    expect(query.mock.calls[0][0]).toContain("c.eliminado_at IS NULL");
    expect(storage.put).not.toHaveBeenCalled();
  });

  it("removes the object when the center is deleted while its upload is in progress", async () => {
    const query = vi
      .fn()
      .mockResolvedValueOnce([{ id: "10" }])
      .mockResolvedValueOnce([{ id: "3" }])
      .mockResolvedValueOnce([{ next: 1 }])
      .mockResolvedValueOnce([]);
    const storage = {
      put: vi.fn(),
      remove: vi.fn().mockResolvedValue(undefined),
    };
    const transaction = vi.fn(async (callback: (manager: unknown) => unknown) =>
      callback({ query }),
    );
    const service = new MediaService(
      { transaction } as never,
      storage as never,
      { getOrThrow: vi.fn().mockReturnValue(1024) } as never,
    );

    await expect(
      service.upload(7, "EC-001", {
        originalName: "plan.pdf",
        mimeType: "application/pdf",
        typeCode: "PLAN_CONTINGENCIA",
        buffer: Buffer.from("%PDF-1.7\ncontenido"),
      }),
    ).rejects.toThrow("No se encontró la ficha turística.");
    expect(query.mock.calls[3][0]).toContain("eliminado_at IS NULL FOR UPDATE");
    expect(storage.remove).toHaveBeenCalledWith(storage.put.mock.calls[0][0]);
    expect(
      query.mock.calls.some(([sql]) =>
        sql.includes("INSERT INTO archivos_centro_turistico"),
      ),
    ).toBe(false);
  });

  it("retains objects and metadata when media removal is attempted on a deleted center", async () => {
    const query = vi.fn().mockResolvedValue([]);
    const storage = { remove: vi.fn() };
    const transaction = vi.fn(async (callback: (manager: unknown) => unknown) =>
      callback({ query }),
    );
    const service = new MediaService(
      { transaction } as never,
      storage as never,
      {} as never,
    );

    await expect(service.remove(7, "EC-001", 3)).rejects.toThrow(
      "No se encontró la fotografía.",
    );
    expect(query.mock.calls[0][0]).toContain("c.eliminado_at IS NULL");
    expect(query).toHaveBeenCalledTimes(1);
    expect(storage.remove).not.toHaveBeenCalled();
  });

  it("excludes deleted centers from administrative and public media reads", async () => {
    const query = vi.fn().mockResolvedValue([]);
    const storage = { get: vi.fn() };
    const service = new MediaService(
      { query } as never,
      storage as never,
      {} as never,
    );

    await expect(service.listForAdmin("EC-001")).resolves.toEqual({
      items: [],
    });
    await expect(service.publicFile(3)).rejects.toThrow(
      "No se encontró la fotografía.",
    );
    expect(
      query.mock.calls.every(([sql]) => sql.includes("c.eliminado_at IS NULL")),
    ).toBe(true);
    expect(storage.get).not.toHaveBeenCalled();
  });
});
