import { describe, expect, it, vi } from "vitest";

import { EstablishmentMediaService } from "../src/files/establishment-media.service";

const png = Buffer.concat([
  Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
  Buffer.alloc(16),
]);

type QueryMock = (sql: string, params?: unknown[]) => Promise<unknown[]>;

function config() {
  return {
    getOrThrow: vi.fn((key: string) => {
      if (key === "MEDIA_MAX_IMAGE_BYTES") return 10 * 1024 * 1024;
      if (key === "MEDIA_MAX_UPLOAD_BYTES") return 50 * 1024 * 1024;
      if (key === "MEDIA_STORAGE_PROVIDER") return "LOCAL";
      throw new Error(`unexpected config ${key}`);
    }),
  };
}

function transactional(query: (sql: string, params?: unknown[]) => unknown) {
  return vi.fn(async (callback: (manager: unknown) => unknown) =>
    callback({ query }),
  );
}

describe("EstablishmentMediaService", () => {
  it("accepts only real images before opening a transaction", async () => {
    const transaction = vi.fn();
    const storage = { put: vi.fn() };
    const service = new EstablishmentMediaService(
      { transaction } as never,
      storage as never,
      config() as never,
    );

    await expect(
      service.upload(9, "8", {
        originalName: "plan.pdf",
        mimeType: "application/pdf",
        buffer: Buffer.from("%PDF-1.7\ncontenido"),
      }),
    ).rejects.toThrow("Solo se aceptan imágenes JPEG, PNG o WebP.");
    await expect(
      service.upload(9, "8", {
        originalName: "foto.png",
        mimeType: "image/png",
        buffer: Buffer.from("not-an-image"),
      }),
    ).rejects.toThrow("La fotografía no es válida.");
    await expect(
      service.upload(9, "x", {
        originalName: "foto.png",
        mimeType: "image/png",
        buffer: png,
      }),
    ).rejects.toThrow("identificador del establecimiento");
    expect(transaction).not.toHaveBeenCalled();
    expect(storage.put).not.toHaveBeenCalled();
  });

  it("publishes an administrator photo of that establishment and audits it", async () => {
    const query = vi.fn<QueryMock>(async (sql) => {
      if (sql.includes("FROM establecimientos_turisticos"))
        return [{ id: "8" }];
      if (sql.includes("MAX(orden)")) return [{ next: 2 }];
      if (sql.includes("RETURNING id")) return [{ id: "40" }];
      return [];
    });
    const storage = { put: vi.fn(), remove: vi.fn() };
    const service = new EstablishmentMediaService(
      { transaction: transactional(query) } as never,
      storage as never,
      config() as never,
    );

    await expect(
      service.upload(9, "8", {
        originalName: "fachada.png",
        mimeType: "image/png",
        buffer: png,
        description: " Fachada ",
      }),
    ).resolves.toMatchObject({
      id: 40,
      order: 2,
      state: "PUBLICADO",
      description: "Fachada",
      downloadUrl: "/api/v1/media/establishments/40",
    });
    expect(storage.put).toHaveBeenCalledWith(
      expect.stringMatching(/^establishments\/8\/photos\/.+\.png$/),
      png,
      "image/png",
    );
    expect(query).toHaveBeenCalledWith(
      expect.stringContaining("INSERT INTO archivos_establecimiento_turistico"),
      expect.arrayContaining([8, "fachada.png", "PUBLICADO", 9]),
    );
    expect(query).toHaveBeenCalledWith(
      expect.stringContaining("INSERT INTO auditoria_catalogos"),
      [9, 8, "AGREGAR_MULTIMEDIA", expect.stringContaining('"mediaId":40')],
    );
  });

  it("keeps an agent photo pending and scopes it to their editable catastro", async () => {
    const query = vi.fn<QueryMock>(async (sql) => {
      if (sql.includes("FROM establecimientos_turisticos"))
        return [{ id: "8" }];
      if (sql.includes("MAX(orden)")) return [{ next: 1 }];
      if (sql.includes("RETURNING id")) return [{ id: "41" }];
      return [];
    });
    const service = new EstablishmentMediaService(
      { transaction: transactional(query) } as never,
      { put: vi.fn(), remove: vi.fn() } as never,
      config() as never,
    );

    await expect(
      service.upload(
        12,
        "8",
        { originalName: "foto.png", mimeType: "image/png", buffer: png },
        false,
      ),
    ).resolves.toMatchObject({ state: "PENDIENTE", downloadUrl: null });
    const [scopeSql, scopeParams] = query.mock.calls[0] ?? [];
    expect(scopeSql).toContain("e.responsable_usuario_id = $3");
    expect(scopeSql).toContain(
      "e.estado_revision IN ('BORRADOR', 'RECHAZADO')",
    );
    expect(scopeParams).toEqual([8, false, 12]);
  });

  it("removes the stored object when the catastro disappears mid-upload", async () => {
    const query = vi
      .fn()
      .mockResolvedValueOnce([{ id: "8" }])
      .mockResolvedValueOnce([{ next: 1 }])
      .mockResolvedValueOnce([]);
    const storage = {
      put: vi.fn(),
      remove: vi.fn().mockResolvedValue(undefined),
    };
    const service = new EstablishmentMediaService(
      { transaction: transactional(query) } as never,
      storage as never,
      config() as never,
    );

    await expect(
      service.upload(9, "8", {
        originalName: "foto.png",
        mimeType: "image/png",
        buffer: png,
      }),
    ).rejects.toThrow("No se encontró el establecimiento.");
    expect(storage.remove).toHaveBeenCalledWith(storage.put.mock.calls[0][0]);
  });

  it("marks a photo deleted, audits it and removes the object", async () => {
    const query = vi
      .fn()
      .mockResolvedValueOnce([
        { id: "40", key: "establishments/8/photos/a.png", state: "PUBLICADO" },
      ])
      .mockResolvedValue([]);
    const storage = { remove: vi.fn().mockResolvedValue(undefined) };
    const service = new EstablishmentMediaService(
      { transaction: transactional(query) } as never,
      storage as never,
      {} as never,
    );

    await expect(service.remove(9, "8", 40)).resolves.toEqual({
      id: 40,
      state: "ELIMINADO",
    });
    expect(query.mock.calls[1]?.[0]).toContain("SET estado = 'ELIMINADO'");
    expect(query.mock.calls[2]?.[1]).toEqual([
      9,
      8,
      "ELIMINAR_MULTIMEDIA",
      JSON.stringify({ mediaId: 40, previousState: "PUBLICADO" }),
    ]);
    expect(storage.remove).toHaveBeenCalledWith(
      "establishments/8/photos/a.png",
    );
  });

  it("serves only published photos of visible catastros", async () => {
    const query = vi.fn().mockResolvedValue([]);
    const storage = { get: vi.fn() };
    const service = new EstablishmentMediaService(
      { query } as never,
      storage as never,
      {} as never,
    );

    await expect(service.publicFile(40)).rejects.toThrow(
      "No se encontró la fotografía.",
    );
    const [sql] = query.mock.calls[0] ?? [];
    expect(sql).toContain("a.estado = 'PUBLICADO'");
    expect(sql).toContain("e.estado_revision = 'PUBLICADO'");
    expect(sql).toContain("e.eliminado_at IS NULL");
    expect(storage.get).not.toHaveBeenCalled();
  });
});
