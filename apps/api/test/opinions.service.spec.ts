import { describe, expect, it, vi } from "vitest";

import { OpinionsService } from "../src/opinions/opinions.service";

const firstReviewCode = "11111111-1111-4111-8111-111111111111";
const secondReviewCode = "22222222-2222-4222-8222-222222222222";

function dataSourceFor(managerQuery: ReturnType<typeof vi.fn>) {
  const transaction = vi.fn(async (callback: (manager: unknown) => unknown) =>
    callback({ query: managerQuery }),
  );
  return { query: vi.fn(), transaction } as never;
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
