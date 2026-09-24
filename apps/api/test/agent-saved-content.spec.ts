import { describe, expect, it, vi } from "vitest";

import { AgentHistoryService } from "../src/ai/application/agent-history.service";
import {
  AgentItinerariesService,
  savedItineraryInputSchema,
} from "../src/ai/application/agent-itineraries.service";

const codes = ["020101MC010202001", "020101MC010202002"];
const plan = {
  title: "Paseo",
  summary: "Dos paradas publicadas",
  days: [{ date: null, stops: codes }],
};

describe("saved tourism content", () => {
  it("rejects plans with repeated stops or fewer than two stops", () => {
    expect(
      savedItineraryInputSchema.safeParse({
        ...plan,
        days: [{ date: null, stops: [codes[0], codes[0]] }],
      }).success,
    ).toBe(false);
    expect(
      savedItineraryInputSchema.safeParse({
        ...plan,
        days: [{ date: null, stops: [codes[0]] }],
      }).success,
    ).toBe(false);
  });

  it("refuses to save an itinerary if any center is unpublished", async () => {
    const query = vi.fn().mockResolvedValue([{ code: codes[0] }]);
    const service = new AgentItinerariesService({
      transaction: (work: (manager: unknown) => unknown) => work({ query }),
    } as never);
    await expect(service.create(9, plan)).rejects.toThrow(
      "Una parada ya no está publicada.",
    );
    expect(query).toHaveBeenCalledTimes(1);
    expect(query.mock.calls[0][0]).toContain("e.codigo = 'PUBLICADO'");
    expect(query.mock.calls[0][1]).toEqual([codes]);
  });

  it("cannot edit another user's itinerary", async () => {
    const query = vi.fn().mockResolvedValue([]);
    const service = new AgentItinerariesService({
      transaction: (work: (manager: unknown) => unknown) => work({ query }),
    } as never);
    await expect(
      service.update(9, "53de238d-55a7-4a39-a993-429e161314e6", plan),
    ).rejects.toThrow("El plan no está disponible.");
    expect(query).toHaveBeenCalledTimes(1);
    expect(query.mock.calls[0][0]).toContain("usuario_id = $2");
    expect(query.mock.calls[0][1][1]).toBe(9);
  });

  it("does not record chat turns without explicit consent", async () => {
    const query = vi.fn().mockResolvedValue([]);
    const service = new AgentHistoryService({
      transaction: (work: (manager: unknown) => unknown) => work({ query }),
    } as never);
    const id = await service.recordTurn(9, undefined, "Hola", {
      text: "Hola",
      cards: [],
      actions: [],
      sources: [],
    });
    expect(id).toBeNull();
    expect(query).toHaveBeenCalledTimes(1);
    expect(query.mock.calls[0][0]).toContain("preferencias_historial_ia");
  });

  it("records only a consenting user's turn and strips coordinate pairs", async () => {
    const query = vi
      .fn()
      .mockResolvedValueOnce([{ habilitado: true }])
      .mockResolvedValueOnce([
        { id: "41", public_id: "53de238d-55a7-4a39-a993-429e161314e6" },
      ])
      .mockResolvedValue([]);
    const service = new AgentHistoryService({
      transaction: (work: (manager: unknown) => unknown) => work({ query }),
    } as never);
    const id = await service.recordTurn(
      9,
      undefined,
      "Cerca de -1.59237, -79.00442",
      {
        text: "Desde -1.59237, -79.00442",
        cards: [],
        actions: [],
        sources: [{ type: "center", label: "Catálogo" }],
      },
    );
    expect(id).toBe("53de238d-55a7-4a39-a993-429e161314e6");
    expect(query.mock.calls[1][1]).toEqual([9]);
    expect(query.mock.calls[2][1]).toEqual([
      "41",
      "Cerca de [ubicación omitida]",
    ]);
    expect(query.mock.calls[3][1]).toEqual([
      "41",
      "Desde [ubicación omitida]",
      '[{"type":"center","label":"Catálogo"}]',
    ]);
  });

  it("redacts short decimal pairs and labeled coordinates from voluntary history", async () => {
    const query = vi
      .fn()
      .mockResolvedValueOnce([{ habilitado: true }])
      .mockResolvedValueOnce([
        { id: "41", public_id: "53de238d-55a7-4a39-a993-429e161314e6" },
      ])
      .mockResolvedValue([]);
    const service = new AgentHistoryService({
      transaction: (work: (manager: unknown) => unknown) => work({ query }),
    } as never);
    await service.recordTurn(
      9,
      undefined,
      "Estoy en -1.59 -79.00, lat=-1.5923",
      { text: "lon=-79.0044", cards: [], actions: [], sources: [] },
    );
    expect(query.mock.calls[2][1][1]).toBe(
      "Estoy en [ubicación omitida], [ubicación omitida]",
    );
    expect(query.mock.calls[3][1][1]).toBe("[ubicación omitida]");
  });

  it("purges only voluntary conversations owned by the user when disabled", async () => {
    const query = vi.fn().mockResolvedValue([]);
    const service = new AgentHistoryService({
      transaction: (work: (manager: unknown) => unknown) => work({ query }),
    } as never);
    await service.setEnabled(9, false);
    expect(query).toHaveBeenCalledTimes(2);
    expect(query.mock.calls[1][0]).toContain(
      "usuario_id = $1 AND historial_voluntario",
    );
    expect(query.mock.calls[1][1]).toEqual([9]);
  });
});
