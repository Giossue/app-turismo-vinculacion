import { describe, expect, it, vi } from "vitest";

import {
  createCenterOpinion,
  editCenterOpinion,
  getMyCenterOpinion,
  listCenterOpinions,
} from "./opinions-api";

const opinionState = {
  status: "APROBADA" as const,
  current: {
    rating: 5,
    comment: "Un lugar muy especial.",
    version: 1,
    submittedAt: "2026-09-20T12:00:00.000Z",
    reviewedAt: "2026-09-20T12:01:00.000Z",
  },
  pending: null,
  lastRejected: null,
  canCreate: false,
  canEdit: true,
};

describe("opinions API", () => {
  it("validates the public opinion summary and list", async () => {
    const fetcher = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        data: {
          items: [
            {
              authorName: "Ana",
              rating: 5,
              comment: "Un lugar muy especial.",
              publishedAt: "2026-09-20T12:00:00.000Z",
            },
          ],
          total: 1,
          limit: 20,
          offset: 0,
          summary: {
            total: 1,
            totalRatings: 1,
            averageRating: 5,
            distribution: { "1": 0, "2": 0, "3": 0, "4": 0, "5": 1 },
          },
        },
      }),
    });

    await expect(
      listCenterOpinions(
        "CENTER-1",
        { limit: 20, offset: 40 },
        { apiUrl: "http://api.test/api/v1", fetcher },
      ),
    ).resolves.toMatchObject({ total: 1, items: [{ authorName: "Ana" }] });
    expect(fetcher).toHaveBeenCalledWith(
      "http://api.test/api/v1/centers/CENTER-1/opinions?limit=20&offset=40",
      { headers: { Accept: "application/json" }, signal: undefined },
    );
  });

  it("keeps an authenticated user's empty state distinct from an error", async () => {
    const request = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ data: null }),
    });

    await expect(
      getMyCenterOpinion("CENTER-1", request, "http://api.test/api/v1"),
    ).resolves.toBeNull();
  });

  it("sends a new opinion with only the supplied content", async () => {
    const request = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ data: opinionState }),
    });

    await expect(
      createCenterOpinion(
        "CENTER-1",
        { rating: null, comment: "  Un comentario útil.  " },
        request,
        "http://api.test/api/v1",
      ),
    ).resolves.toEqual(opinionState);
    expect(request).toHaveBeenCalledWith(
      "http://api.test/api/v1/opinions/centers/CENTER-1",
      {
        body: JSON.stringify({ comment: "Un comentario útil." }),
        headers: { "content-type": "application/json" },
        method: "POST",
      },
    );
  });

  it("uses PATCH when an approved opinion is edited", async () => {
    const request = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ data: { ...opinionState, status: "PENDIENTE" } }),
    });

    await editCenterOpinion(
      "CENTER-1",
      { rating: 4, comment: "Buena visita." },
      request,
      "http://api.test/api/v1",
    );

    expect(request).toHaveBeenCalledWith(
      "http://api.test/api/v1/opinions/centers/CENTER-1",
      {
        body: JSON.stringify({ rating: 4, comment: "Buena visita." }),
        headers: { "content-type": "application/json" },
        method: "PATCH",
      },
    );
  });
});
