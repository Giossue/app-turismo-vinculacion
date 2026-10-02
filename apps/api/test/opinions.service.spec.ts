import { describe, expect, it, vi } from "vitest";
import type { DataSource } from "typeorm";

import { OpinionsService } from "../src/opinions/opinions.service";

const firstReviewCode = "11111111-1111-4111-8111-111111111111";
const secondReviewCode = "22222222-2222-4222-8222-222222222222";

function dataSourceFor(managerQuery: ReturnType<typeof vi.fn>) {
  const transaction = vi.fn(async (callback: (manager: unknown) => unknown) =>
    callback({ query: managerQuery }),
  );
  return { query: vi.fn(), transaction } as unknown as DataSource;
}

describe("OpinionsService", () => {
  it("approves a first opinion and records the moderated version", async () => {
    const managerQuery = vi
      .fn()
      .mockResolvedValueOnce([
        {
          version_id: "21",
          review_code: firstReviewCode,
          opinion_id: "8",
          version_publicada_id: null,
        },
      ])
      .mockResolvedValue([]);
    const service = new OpinionsService(dataSourceFor(managerQuery));

    await expect(
      service.review(firstReviewCode, 9, "APPROVE"),
    ).resolves.toEqual({
      reviewCode: firstReviewCode,
      status: "APROBADA",
    });

    expect(managerQuery).toHaveBeenCalledWith(
      expect.stringContaining("version_publicada_id = $2"),
      ["8", "21"],
    );
    expect(managerQuery).toHaveBeenCalledWith(
      expect.stringContaining("opinion_version_id, moderador_id"),
      ["8", "21", 9, "APROBAR", null],
    );
  });

  it("rejects an edited version without removing the published version", async () => {
    const managerQuery = vi
      .fn()
      .mockResolvedValueOnce([
        {
          version_id: "31",
          review_code: secondReviewCode,
          opinion_id: "8",
          version_publicada_id: "21",
        },
      ])
      .mockResolvedValue([]);
    const service = new OpinionsService(dataSourceFor(managerQuery));

    await expect(
      service.review(
        secondReviewCode,
        9,
        "REJECT",
        "El comentario necesita más detalle.",
      ),
    ).resolves.toEqual({
      reviewCode: secondReviewCode,
      status: "RECHAZADA",
    });

    expect(managerQuery).toHaveBeenCalledWith(
      expect.stringContaining("estado_moderacion = 'RECHAZADA'"),
      ["31"],
    );
    expect(managerQuery).toHaveBeenCalledWith(
      expect.stringContaining("SET estado_moderacion = $2"),
      ["8", "APROBADA"],
    );
    expect(managerQuery).toHaveBeenCalledWith(
      expect.stringContaining("opinion_version_id, moderador_id"),
      ["8", "31", 9, "RECHAZAR", "El comentario necesita más detalle."],
    );
  });

  it("rejects a first opinion as unavailable for publication", async () => {
    const managerQuery = vi
      .fn()
      .mockResolvedValueOnce([
        {
          version_id: "41",
          review_code: firstReviewCode,
          opinion_id: "12",
          version_publicada_id: null,
        },
      ])
      .mockResolvedValue([]);
    const service = new OpinionsService(dataSourceFor(managerQuery));

    await service.review(
      firstReviewCode,
      9,
      "REJECT",
      "Contenido insuficiente.",
    );

    expect(managerQuery).toHaveBeenCalledWith(
      expect.stringContaining("SET estado_moderacion = $2"),
      ["12", "RECHAZADA"],
    );
  });

  it("keeps published opinions and pending edits in the admin list", async () => {
    const query = vi
      .fn()
      .mockResolvedValueOnce([
        {
          review_code: firstReviewCode,
          status: "APROBADA",
          numero_version: "1",
          submitted_at: "2026-09-20T12:00:00.000Z",
          author_name: "Ana Visitante",
          target_type: "CENTRO",
          target_code: "CENTER-1",
          target_name: "Centro de prueba",
          proposed_rating: 5,
          proposed_comment: "Publicado",
          proposed_version: "1",
          proposed_submitted_at: "2026-09-20T12:00:00.000Z",
          current_rating: 5,
          current_comment: "Publicado",
          current_version: "1",
          current_submitted_at: "2026-09-20T12:00:00.000Z",
        },
        {
          review_code: secondReviewCode,
          status: "PENDIENTE",
          numero_version: "2",
          submitted_at: "2026-09-21T12:00:00.000Z",
          author_name: "Bruno Visitante",
          target_type: "CENTRO",
          target_code: "CENTER-2",
          target_name: "Otro centro",
          proposed_rating: 4,
          proposed_comment: "Edición pendiente",
          proposed_version: "2",
          proposed_submitted_at: "2026-09-21T12:00:00.000Z",
          current_rating: 3,
          current_comment: "Versión anterior",
          current_version: "1",
          current_submitted_at: "2026-09-19T12:00:00.000Z",
        },
      ])
      .mockResolvedValueOnce([{ total: "2" }]);
    const service = new OpinionsService({
      query,
      transaction: vi.fn(),
    } as never);

    await expect(service.listAdmin(20, 0)).resolves.toMatchObject({
      items: [
        {
          status: "APROBADA",
          current: null,
          proposed: { version: 1, rating: 5, comment: "Publicado" },
        },
        {
          status: "PENDIENTE",
          current: { version: 1, rating: 3 },
          proposed: { version: 2, rating: 4, comment: "Edición pendiente" },
        },
      ],
      total: 2,
      limit: 20,
      offset: 0,
    });
    expect(query).toHaveBeenNthCalledWith(
      1,
      expect.stringContaining("published_v"),
      [20, 0],
    );
  });

  it("returns every opinion version and its moderation history for administrators", async () => {
    const query = vi.fn().mockResolvedValue([
      {
        review_code: secondReviewCode,
        numero_version: "2",
        calificacion: 4,
        comentario: "Edición pendiente",
        status: "PENDIENTE",
        submitted_at: "2026-09-21T12:00:00.000Z",
        reviewed_at: null,
        author_name: "Bruno Visitante",
        target_type: "CENTRO",
        target_code: "CENTER-2",
        target_name: "Otro centro",
        moderations: [],
      },
      {
        review_code: firstReviewCode,
        numero_version: "1",
        calificacion: 3,
        comentario: "Versión anterior",
        status: "APROBADA",
        submitted_at: "2026-09-19T12:00:00.000Z",
        reviewed_at: "2026-09-19T13:00:00.000Z",
        author_name: "Bruno Visitante",
        target_type: "CENTRO",
        target_code: "CENTER-2",
        target_name: "Otro centro",
        moderations: [
          {
            action: "APROBAR",
            reason: null,
            moderatorName: "Ana Administradora",
            createdAt: "2026-09-19T13:00:00.000Z",
          },
        ],
      },
    ]);
    const service = new OpinionsService({ query } as never);

    await expect(service.getAdminHistory(secondReviewCode)).resolves.toEqual({
      reviewCode: secondReviewCode,
      deletedAt: null,
      authorName: "Bruno Visitante",
      target: {
        type: "CENTRO",
        code: "CENTER-2",
        name: "Otro centro",
      },
      versions: [
        {
          reviewCode: secondReviewCode,
          version: 2,
          rating: 4,
          comment: "Edición pendiente",
          status: "PENDIENTE",
          submittedAt: "2026-09-21T12:00:00.000Z",
          reviewedAt: null,
          moderations: [],
        },
        {
          reviewCode: firstReviewCode,
          version: 1,
          rating: 3,
          comment: "Versión anterior",
          status: "APROBADA",
          submittedAt: "2026-09-19T12:00:00.000Z",
          reviewedAt: "2026-09-19T13:00:00.000Z",
          moderations: [
            {
              action: "APROBAR",
              reason: null,
              moderatorName: "Ana Administradora",
              createdAt: "2026-09-19T13:00:00.000Z",
            },
          ],
        },
      ],
    });
    expect(query).toHaveBeenCalledWith(
      expect.stringContaining("moderaciones_opinion"),
      [secondReviewCode],
    );
  });

  it("requires a reason for rejection before opening a transaction", async () => {
    const dataSource = dataSourceFor(vi.fn());
    const service = new OpinionsService(dataSource);

    await expect(service.review(firstReviewCode, 9, "REJECT")).rejects.toThrow(
      "motivo",
    );
    expect(dataSource.transaction).not.toHaveBeenCalled();
  });

  it("scopes edits to the authenticated user and refuses another user's opinion", async () => {
    const managerQuery = vi
      .fn()
      .mockResolvedValueOnce([{ id: "77", code: "CENTER-1", name: "Centro" }])
      .mockResolvedValueOnce([]);
    const service = new OpinionsService(dataSourceFor(managerQuery));

    await expect(
      service.edit("CENTER-1", 99, { rating: 5, comment: "Excelente" }),
    ).rejects.toThrow("No tienes una opinión publicada");
    expect(managerQuery).toHaveBeenNthCalledWith(
      2,
      expect.stringContaining("WHERE usuario_id = $1"),
      [99, "77"],
    );
  });

  it("removes the entire opinion while retaining versions and recording its actor", async () => {
    const managerQuery = vi
      .fn()
      .mockResolvedValueOnce([
        { opinion_id: "8", version_id: "31", eliminado_at: null },
      ])
      .mockResolvedValue([]);
    const dataSource = dataSourceFor(managerQuery);
    const service = new OpinionsService(dataSource);

    await expect(service.remove(secondReviewCode, 9)).resolves.toEqual({
      reviewCode: secondReviewCode,
      deleted: true,
    });
    expect(dataSource.transaction).toHaveBeenCalledOnce();
    expect(dataSource.query).not.toHaveBeenCalled();
    expect(managerQuery).toHaveBeenNthCalledWith(
      1,
      expect.stringContaining("FOR UPDATE OF o"),
      [secondReviewCode],
    );
    expect(managerQuery).toHaveBeenNthCalledWith(
      2,
      expect.stringContaining("SET eliminado_at = CURRENT_TIMESTAMP"),
      ["8"],
    );
    expect(managerQuery).toHaveBeenNthCalledWith(
      3,
      expect.stringContaining("'ELIMINAR'"),
      ["8", "31", 9],
    );
    expect(
      managerQuery.mock.calls.some(([sql]) => /\bDELETE\s+FROM\b/i.test(sql)),
    ).toBe(false);
  });

  it("retries a deletion without recording duplicate audit events", async () => {
    const managerQuery = vi.fn().mockResolvedValue([
      {
        opinion_id: "8",
        version_id: "31",
        eliminado_at: "2026-10-02T12:00:00.000Z",
      },
    ]);
    const service = new OpinionsService(dataSourceFor(managerQuery));

    await expect(service.remove(secondReviewCode, 9)).resolves.toMatchObject({
      deleted: true,
    });
    expect(managerQuery).toHaveBeenCalledOnce();
  });

  it("rejects an invalid deletion code before opening a transaction", async () => {
    const dataSource = dataSourceFor(vi.fn());
    const service = new OpinionsService(dataSource);

    await expect(service.remove("invalid", 9)).rejects.toThrow(
      "código de revisión no es válido",
    );
    expect(dataSource.transaction).not.toHaveBeenCalled();
  });

  it("does not modify another opinion when the public code is missing", async () => {
    const managerQuery = vi.fn().mockResolvedValue([]);
    const service = new OpinionsService(dataSourceFor(managerQuery));

    await expect(service.remove(firstReviewCode, 9)).rejects.toThrow(
      "opinión no está disponible",
    );
    expect(managerQuery).toHaveBeenCalledOnce();
  });

  it("rejects the deletion transaction when its audit cannot be written", async () => {
    const auditFailure = new Error("Audit insert failed");
    const managerQuery = vi
      .fn()
      .mockResolvedValueOnce([
        { opinion_id: "8", version_id: "31", eliminado_at: null },
      ])
      .mockResolvedValueOnce([])
      .mockRejectedValueOnce(auditFailure);
    const dataSource = dataSourceFor(managerQuery);
    const service = new OpinionsService(dataSource);

    await expect(service.remove(secondReviewCode, 9)).rejects.toBe(
      auditFailure,
    );
    expect(dataSource.query).not.toHaveBeenCalled();
    await expect(
      vi.mocked(dataSource.transaction).mock.results[0]?.value,
    ).rejects.toBe(auditFailure);
  });

  it("keeps an approved version in public totals during a pending edit and excludes deleted roots", async () => {
    const query = vi
      .fn()
      .mockResolvedValueOnce([{ id: "77", code: "CENTER-1", name: "Centro" }])
      .mockResolvedValueOnce([
        {
          author_name: "Ana",
          rating: 4,
          comment: "Versión publicada",
          published_at: "2026-09-20T12:00:00.000Z",
        },
      ])
      .mockResolvedValueOnce([
        { total: 1, total_ratings: 1, average_rating: 4, rating_4: 1 },
      ]);
    const service = new OpinionsService({ query } as never);

    await expect(
      service.listPublished("CENTER-1", 20, 0),
    ).resolves.toMatchObject({
      items: [{ rating: 4, comment: "Versión publicada" }],
      total: 1,
      summary: { total: 1, totalRatings: 1, averageRating: 4 },
    });
    for (const [sql] of query.mock.calls.slice(1)) {
      expect(sql).toContain("o.eliminado_at IS NULL");
      expect(sql).toContain("o.estado_moderacion IN ('PENDIENTE', 'APROBADA')");
      expect(sql).toContain("v.id = o.version_publicada_id");
      expect(sql).toContain("v.estado_moderacion = 'APROBADA'");
    }
  });

  it("excludes deleted opinions from both the admin rows and count", async () => {
    const query = vi
      .fn()
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([{ total: 0 }]);
    const service = new OpinionsService({ query } as never);

    await expect(service.listAdmin(20, 0)).resolves.toMatchObject({
      items: [],
      total: 0,
    });
    for (const [sql] of query.mock.calls) {
      expect(sql).toContain("o.eliminado_at IS NULL");
    }
  });

  it("allows a fresh opinion after deletion instead of reusing the deleted history", async () => {
    const managerQuery = vi
      .fn()
      .mockResolvedValueOnce([{ id: "77", code: "CENTER-1", name: "Centro" }])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([{ id: "99" }])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([
        {
          root_status: "PENDIENTE",
          pending_version: 1,
          pending_rating: 5,
          pending_comment: "Nueva opinión",
          pending_submitted_at: "2026-10-02T13:00:00.000Z",
        },
      ]);
    const service = new OpinionsService(dataSourceFor(managerQuery));

    await expect(
      service.create("CENTER-1", 9, { rating: 5, comment: "Nueva opinión" }),
    ).resolves.toMatchObject({
      status: "PENDIENTE",
      current: null,
      pending: { version: 1, comment: "Nueva opinión" },
    });
    expect(managerQuery.mock.calls[0]?.[0]).toContain("FOR SHARE OF c");
    expect(managerQuery).toHaveBeenNthCalledWith(
      2,
      expect.stringContaining("AND eliminado_at IS NULL"),
      [9, "77"],
    );
    expect(managerQuery.mock.calls[3]?.[1]).toEqual([
      expect.any(String),
      "99",
      5,
      "Nueva opinión",
    ]);
    expect(managerQuery.mock.calls[4]?.[0]).toContain("o.eliminado_at IS NULL");
  });

  it("does not expose a deleted opinion in the visitor's own state", async () => {
    const query = vi
      .fn()
      .mockResolvedValueOnce([{ id: "77", code: "CENTER-1", name: "Centro" }])
      .mockResolvedValueOnce([]);
    const service = new OpinionsService({ query } as never);

    await expect(service.getOwn("CENTER-1", 9)).resolves.toBeNull();
    expect(query.mock.calls[0]?.[0]).not.toContain("FOR SHARE");
    expect(query.mock.calls[1]?.[0]).toContain("o.eliminado_at IS NULL");
  });

  it("refuses a stale edit after the administrator deletes the opinion", async () => {
    const managerQuery = vi
      .fn()
      .mockResolvedValueOnce([{ id: "77", code: "CENTER-1", name: "Centro" }])
      .mockResolvedValueOnce([]);
    const service = new OpinionsService(dataSourceFor(managerQuery));

    await expect(service.edit("CENTER-1", 9, { rating: 5 })).rejects.toThrow(
      "No tienes una opinión publicada",
    );
    expect(managerQuery.mock.calls[0]?.[0]).toContain("FOR SHARE OF c");
    expect(managerQuery.mock.calls[1]?.[0]).toContain(
      "AND eliminado_at IS NULL",
    );
    expect(managerQuery).toHaveBeenCalledTimes(2);
  });

  it.each(["create", "edit"] as const)(
    "refuses %s when the center was deleted before the transaction obtains its lock",
    async (operation) => {
      const managerQuery = vi.fn().mockResolvedValue([]);
      const service = new OpinionsService(dataSourceFor(managerQuery));

      await expect(
        service[operation]("CENTER-1", 9, { rating: 5 }),
      ).rejects.toThrow("El centro turístico ya no está disponible");
      expect(managerQuery).toHaveBeenCalledOnce();
      expect(managerQuery.mock.calls[0]?.[0]).toContain("FOR SHARE OF c");
      expect(managerQuery.mock.calls[0]?.[0]).toContain(
        "c.eliminado_at IS NULL",
      );
    },
  );

  it("refuses stale approval and rejection after an opinion is deleted", async () => {
    for (const action of ["APPROVE", "REJECT"] as const) {
      const managerQuery = vi.fn().mockResolvedValue([]);
      const service = new OpinionsService(dataSourceFor(managerQuery));

      await expect(
        service.review(firstReviewCode, 9, action, "Revisión"),
      ).rejects.toThrow("ya no está disponible");
      expect(managerQuery.mock.calls[0]?.[0]).toContain(
        "o.eliminado_at IS NULL",
      );
      expect(managerQuery).toHaveBeenCalledOnce();
    }
  });

  it("retains the deletion event and original version states in admin history", async () => {
    const deletedAt = "2026-10-02T12:00:00.000Z";
    const query = vi.fn().mockResolvedValue([
      {
        review_code: firstReviewCode,
        numero_version: 1,
        calificacion: 4,
        comentario: "Versión histórica",
        status: "APROBADA",
        submitted_at: "2026-09-20T12:00:00.000Z",
        reviewed_at: "2026-09-20T13:00:00.000Z",
        deleted_at: deletedAt,
        author_name: "Ana",
        target_type: "CENTRO",
        target_code: "CENTER-1",
        target_name: "Centro",
        moderations: [
          {
            action: "ELIMINAR",
            moderatorName: "Administradora",
            reason: null,
            createdAt: deletedAt,
          },
        ],
      },
    ]);
    const service = new OpinionsService({ query } as never);

    await expect(
      service.getAdminHistory(firstReviewCode),
    ).resolves.toMatchObject({
      deletedAt,
      versions: [
        {
          status: "APROBADA",
          comment: "Versión histórica",
          moderations: [
            { action: "ELIMINAR", moderatorName: "Administradora" },
          ],
        },
      ],
    });
  });
});
