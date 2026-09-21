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
});
