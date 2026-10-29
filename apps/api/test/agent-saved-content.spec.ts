import { describe, expect, it, vi } from "vitest";

import { AgentHistoryService } from "../src/ai/application/agent-history.service";

describe("saved agent history", () => {
  const turn = {
    text: "Hola",
    cards: [],
    actions: [],
    sources: [],
  };
  const build = (query: ReturnType<typeof vi.fn>) => {
    const purge = vi.fn().mockResolvedValue([]);
    const service = new AgentHistoryService({
      transaction: (work: (manager: unknown) => unknown) => work({ query }),
      query: purge,
    } as never);
    return { service, purge };
  };

  it("records a turn without consent as an internal, non-voluntary conversation", async () => {
    const query = vi
      .fn()
      .mockResolvedValueOnce([{ habilitado: false }])
      .mockResolvedValueOnce([{ id: "7", public_id: "internal" }])
      .mockResolvedValue([]);
    const { service } = build(query);
    const id = await service.recordTurn(9, undefined, "Hola", turn);
    expect(id).toBeNull();
    expect(query.mock.calls[1][0]).toContain("INSERT INTO conversaciones_ia");
    expect(query.mock.calls[1][1]).toEqual([9, false]);
    expect(query.mock.calls[2][1]).toEqual(["7", "USER", "Hola"]);
  });

  it("records a consenting user's turn as voluntary and strips coordinate pairs", async () => {
    const query = vi
      .fn()
      .mockResolvedValueOnce([{ habilitado: true }])
      .mockResolvedValueOnce([
        { id: "41", public_id: "53de238d-55a7-4a39-a993-429e161314e6" },
      ])
      .mockResolvedValue([]);
    const { service } = build(query);
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
    expect(query.mock.calls[1][1]).toEqual([9, true]);
    expect(query.mock.calls[2][1]).toEqual([
      "41",
      "USER",
      "Cerca de [ubicación omitida]",
    ]);
    expect(query.mock.calls[3][1]).toEqual([
      "41",
      "ASSISTANT",
      "Desde [ubicación omitida]",
      '[{"type":"center","label":"Catálogo"}]',
    ]);
  });

  it("redacts short decimal pairs and labeled coordinates", async () => {
    const query = vi
      .fn()
      .mockResolvedValueOnce([{ habilitado: true }])
      .mockResolvedValueOnce([
        { id: "41", public_id: "53de238d-55a7-4a39-a993-429e161314e6" },
      ])
      .mockResolvedValue([]);
    const { service } = build(query);
    await service.recordTurn(
      9,
      undefined,
      "Estoy en -1.59 -79.00, lat=-1.5923",
      { text: "lon=-79.0044", cards: [], actions: [], sources: [] },
    );
    expect(query.mock.calls[2][1][2]).toBe(
      "Estoy en [ubicación omitida], [ubicación omitida]",
    );
    expect(query.mock.calls[3][1][2]).toBe("[ubicación omitida]");
  });

  it("stores each tool call as a TOOL message between question and answer", async () => {
    const query = vi
      .fn()
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([{ id: "7", public_id: "internal" }])
      .mockResolvedValue([]);
    const { service } = build(query);
    await service.recordTurn(9, undefined, "Glamping", turn, [
      {
        tool: "searchPublishedEstablishments",
        input: { kind: "lodging", text: "glamping" },
        output: { total: 0, results: [] },
      },
    ]);
    const roles = query.mock.calls.slice(2, 5).map((call) => call[1][1]);
    expect(roles).toEqual(["USER", "TOOL", "ASSISTANT"]);
    expect(JSON.parse(query.mock.calls[3][1][2])).toEqual({
      tool: "searchPublishedEstablishments",
      input: { kind: "lodging", text: "glamping" },
      output: { total: 0, results: [] },
    });
  });

  it("records a failed turn with its error and never throws", async () => {
    const query = vi
      .fn()
      .mockResolvedValueOnce([{ id: "7", public_id: "internal" }])
      .mockResolvedValue([]);
    const { service } = build(query);
    await service.recordFailure(9, "Glamping", new Error("timeout"));
    expect(query.mock.calls[0][1]).toEqual([9, false]);
    expect(query.mock.calls[2][1]).toEqual(["7", "SYSTEM", "ERROR: timeout"]);

    const broken = new AgentHistoryService({
      transaction: () => Promise.reject(new Error("db caída")),
    } as never);
    await expect(
      broken.recordFailure(9, "Glamping", new Error("timeout")),
    ).resolves.toBeUndefined();
  });

  it("purges expired internal records at most once per hour", async () => {
    const query = vi.fn(async (sql: string) =>
      sql.includes("preferencias_historial_ia")
        ? []
        : sql.includes("INSERT INTO conversaciones_ia")
          ? [{ id: "7", public_id: "internal" }]
          : [],
    );
    const { service, purge } = build(query);
    await service.recordTurn(9, undefined, "Hola", turn);
    await service.recordTurn(9, undefined, "Hola", turn);
    expect(purge).toHaveBeenCalledTimes(1);
    expect(purge.mock.calls[0][0]).toContain("NOT historial_voluntario");
    expect(purge.mock.calls[0][1]).toEqual([30]);
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
