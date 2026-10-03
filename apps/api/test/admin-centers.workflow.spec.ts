import { describe, expect, it, vi } from "vitest";

import { AdminCentersService } from "../src/admin/admin-centers.service";

const center = {
  id: "10",
  code: "020201AN010103001",
  name: "Centro de prueba",
  statusCode: "EN_REVISION",
  statusName: "En revisión",
  active: true,
  publishedAt: null,
  subtypeId: 1,
  touristZoneId: 1,
  parishId: 1,
  productLineId: 1,
  scenarioId: 1,
  hierarchyId: 1,
  latitude: "-1.59",
  longitude: "-79.01",
  altitudeMeters: null,
  description: null,
  barrio: null,
  street: null,
  addressNumber: null,
  crossStreet: null,
  administration: null,
  climate: null,
  admission: null,
};

function serviceWithManager(query: ReturnType<typeof vi.fn>) {
  const manager = { query };
  return new AdminCentersService({
    transaction: vi.fn(async (callback: (value: typeof manager) => unknown) =>
      callback(manager),
    ),
  } as never);
}

function workflowFixture(
  options: { published?: boolean; active?: boolean; draftState?: string } = {},
) {
  const current = {
    ...center,
    statusCode: options.published ? "PUBLICADO" : "EN_REVISION",
    active: options.active ?? true,
    publishedAt: options.published ? "2026-10-01T00:00:00.000Z" : null,
  };
  const frozen = {
    name: "Revisión congelada",
    subtypeId: 1,
    touristZoneId: 1,
    parishId: 1,
    productLineId: 1,
    scenarioId: 1,
    hierarchyId: 1,
    latitude: -1.59,
    longitude: -79.01,
    activities: [],
    accessibility: [],
    facilities: [],
    sections: {},
  };
  const draft = {
    id: "8",
    stateCode: options.draftState ?? "EN_REVISION",
    stateName: "En revisión",
    version: 2,
    data: { ...frozen, name: "Cambio fuera de la revisión" },
  };
  const revision = {
    id: "9",
    stateCode: "EN_REVISION",
    stateName: "En revisión",
    data: frozen,
  };
  const query = vi.fn(async (sql: string, values: unknown[] = []) => {
    if (sql.includes("FOR UPDATE OF c")) return [current];
    if (sql.includes("FROM centros_turisticos c")) return [current];
    if (sql.includes("FROM borradores_centros_turisticos b")) return [draft];
    if (sql.includes("FROM revisiones_publicacion r")) return [revision];
    if (sql.includes("FROM estados_resenia WHERE codigo")) {
      return [{ id: values[0] === "PUBLICADO" ? "3" : "1", name: values[0] }];
    }
    return [];
  });
  const manager = { query };
  const transaction = vi.fn(
    async (callback: (value: typeof manager) => unknown) => callback(manager),
  );
  const publishPending = vi.fn().mockResolvedValue(undefined);
  const service = new AdminCentersService(
    { transaction } as never,
    { publishPending } as never,
  );
  const internal = service as unknown as {
    readPublishedDraft: (...args: unknown[]) => Promise<typeof frozen>;
    validateReferences: (...args: unknown[]) => Promise<void>;
    findById: (...args: unknown[]) => Promise<{ code: string }>;
  };
  const readPublishedDraft = vi
    .spyOn(internal, "readPublishedDraft")
    .mockResolvedValue({ ...frozen, name: "Versión pública anterior" });
  const validateReferences = vi
    .spyOn(internal, "validateReferences")
    .mockResolvedValue(undefined);
  const findById = vi
    .spyOn(internal, "findById")
    .mockResolvedValue({ code: center.code });
  return {
    service,
    query,
    manager,
    transaction,
    publishPending,
    readPublishedDraft,
    validateReferences,
    findById,
    frozen,
    draft,
    revision,
    current,
  };
}

describe("AdminCentersService workflow boundaries", () => {
  it.each([true, false])(
    "approves the frozen revision, publishes media and audits in one transaction without changing active=%s",
    async (active) => {
      const fixture = workflowFixture({ active });
      await expect(
        fixture.service.review(center.code, 99, {
          action: "APPROVE",
          observation: "  Revisión completa  ",
        }),
      ).resolves.toEqual({ code: center.code });
      expect(fixture.transaction).toHaveBeenCalledTimes(1);
      expect(fixture.validateReferences).toHaveBeenCalledWith(
        fixture.manager,
        fixture.frozen,
        true,
        center.id,
        fixture.frozen,
      );
      const publication = fixture.query.mock.calls.find(([sql]) =>
        sql.includes("SET secuencial_atractivo"),
      );
      expect(publication?.[0]).not.toContain("activo = TRUE");
      expect(publication?.[1]?.[2]).toBe(fixture.frozen.name);
      expect(publication?.[1]?.[9]).toBe("3");
      expect(fixture.query).toHaveBeenCalledWith(
        expect.stringContaining("UPDATE revisiones_publicacion"),
        [fixture.revision.id, 99, "3", "Revisión completa"],
      );
      expect(fixture.query).toHaveBeenCalledWith(
        expect.stringContaining("UPDATE borradores_centros_turisticos"),
        [center.id, "3", 99, JSON.stringify(fixture.frozen)],
      );
      expect(fixture.publishPending).toHaveBeenCalledExactlyOnceWith(
        fixture.manager,
        center.id,
        99,
      );
      const audits = fixture.query.mock.calls
        .filter(([sql]) => sql.includes("INSERT INTO auditoria_fichas"))
        .map(([, values]) => values);
      expect(audits.map((values) => values?.slice(0, 3))).toEqual([
        [center.id, 99, "APROBAR"],
        [center.id, 99, "PUBLICAR"],
      ]);
    },
  );

  it.each([false, true])(
    "rejects to draft with the reason while preserving an existing publication=%s",
    async (published) => {
      const fixture = workflowFixture({ published });
      await fixture.service.review(center.code, 99, {
        action: "REJECT",
        observation: "  Corrige la ubicación  ",
      });
      expect(fixture.query).toHaveBeenCalledWith(
        expect.stringContaining("UPDATE revisiones_publicacion"),
        [fixture.revision.id, 99, "1", "Corrige la ubicación"],
      );
      expect(fixture.query).toHaveBeenCalledWith(
        expect.stringContaining("UPDATE borradores_centros_turisticos"),
        [center.id, "1", 99, null],
      );
      const centerUpdates = fixture.query.mock.calls.filter(([sql]) =>
        sql.includes("UPDATE centros_turisticos"),
      );
      expect(centerUpdates).toHaveLength(published ? 0 : 1);
      if (!published) expect(centerUpdates[0]?.[1]).toEqual([center.id, "1"]);
      expect(fixture.publishPending).not.toHaveBeenCalled();
      expect(fixture.readPublishedDraft).not.toHaveBeenCalled();
      expect(fixture.query).toHaveBeenCalledWith(
        expect.stringContaining("INSERT INTO auditoria_fichas"),
        [
          center.id,
          99,
          "RECHAZAR",
          null,
          JSON.stringify({ estado: "EN_REVISION" }),
          JSON.stringify({
            estado: "BORRADOR",
            observacion: "Corrige la ubicación",
          }),
        ],
      );
    },
  );

  it.each([undefined, "", "  "])(
    "requires a rejection reason before opening a transaction (%s)",
    async (observation) => {
      const fixture = workflowFixture();
      await expect(
        fixture.service.review(center.code, 99, {
          action: "REJECT",
          observation,
        }),
      ).rejects.toThrow("motivo del rechazo");
      expect(fixture.transaction).not.toHaveBeenCalled();
    },
  );

  it("rejects the entire transaction when media publication fails without recording success", async () => {
    const fixture = workflowFixture();
    fixture.publishPending.mockRejectedValueOnce(
      new Error("media publication failed"),
    );
    await expect(
      fixture.service.review(center.code, 99, { action: "APPROVE" }),
    ).rejects.toThrow("media publication failed");
    expect(fixture.transaction).toHaveBeenCalledTimes(1);
    expect(fixture.findById).not.toHaveBeenCalled();
    expect(
      fixture.query.mock.calls.some(([sql]) =>
        sql.includes("INSERT INTO auditoria_fichas"),
      ),
    ).toBe(false);
  });

  it("does not mutate or publish media when publication validation fails", async () => {
    const fixture = workflowFixture();
    fixture.validateReferences.mockRejectedValueOnce(
      new Error("invalid publication reference"),
    );
    await expect(
      fixture.service.review(center.code, 99, { action: "APPROVE" }),
    ).rejects.toThrow("invalid publication reference");
    expect(
      fixture.query.mock.calls.some(([sql]) =>
        /^\s*(UPDATE|INSERT|DELETE)\b/.test(sql),
      ),
    ).toBe(false);
    expect(fixture.publishPending).not.toHaveBeenCalled();
  });

  it("does not decide a stale revision when its draft is already editable", async () => {
    const fixture = workflowFixture({ draftState: "BORRADOR" });
    await expect(
      fixture.service.review(center.code, 99, { action: "APPROVE" }),
    ).rejects.toThrow("ya no está en revisión");
    expect(
      fixture.query.mock.calls.some(([sql]) =>
        /^\s*(UPDATE|INSERT|DELETE)\b/.test(sql),
      ),
    ).toBe(false);
  });

  it("acknowledges a legacy publish retry without mutating or duplicating its audits", async () => {
    const fixture = workflowFixture({
      published: true,
      draftState: "PUBLICADO",
    });
    await expect(fixture.service.publish(center.code, 99)).resolves.toEqual({
      code: center.code,
    });
    expect(
      fixture.query.mock.calls.some(([sql]) =>
        /^\s*(UPDATE|INSERT|DELETE)\b/.test(sql),
      ),
    ).toBe(false);
    expect(fixture.publishPending).not.toHaveBeenCalled();
  });

  it("shows an inactive published center with a rejected proposal as an editable draft without losing its public state", async () => {
    const fixture = workflowFixture({
      published: true,
      active: false,
      draftState: "BORRADOR",
    });
    fixture.revision.stateCode = "RECHAZADO";
    const internal = fixture.service as unknown as {
      mapDetail: (...args: unknown[]) => Promise<unknown>;
      readRetainedCatalogOptions: (...args: unknown[]) => Promise<object>;
    };
    vi.spyOn(internal, "readRetainedCatalogOptions").mockResolvedValue({});
    await expect(
      internal.mapDetail(fixture.manager, fixture.current),
    ).resolves.toMatchObject({
      active: false,
      status: { code: "BORRADOR", name: "Borrador" },
      baseStatus: { code: "PUBLICADO", name: "Publicado" },
      published: { name: "Versión pública anterior" },
      draft: { name: fixture.draft.data.name },
      review: { status: { code: "BORRADOR", name: "Borrador" } },
    });
  });

  it.each(["BORRADOR", "EN_REVISION", "APROBADO"])(
    "blocks the legacy publish endpoint for %s proposals",
    async (draftState) => {
      const fixture = workflowFixture({ published: true, draftState });
      await expect(fixture.service.publish(center.code, 99)).rejects.toThrow(
        "Aprueba la revisión",
      );
      expect(
        fixture.query.mock.calls.some(([sql]) =>
          /^\s*(UPDATE|INSERT|DELETE)\b/.test(sql),
        ),
      ).toBe(false);
    },
  );

  it.each([
    {
      operation: "deactivate" as const,
      active: true,
      published: false,
      next: false,
    },
    {
      operation: "deactivate" as const,
      active: true,
      published: true,
      next: false,
    },
    {
      operation: "reactivate" as const,
      active: false,
      published: false,
      next: true,
    },
    {
      operation: "reactivate" as const,
      active: false,
      published: true,
      next: true,
    },
  ])(
    "$operation preserves the editorial state with published=$published",
    async ({ operation, active, published, next }) => {
      const fixture = workflowFixture({ active, published });
      await fixture.service[operation](center.code, 99);
      const update = fixture.query.mock.calls.find(([sql]) =>
        sql.includes("UPDATE centros_turisticos"),
      );
      expect(update?.[0]).toContain(`activo = ${next ? "TRUE" : "FALSE"}`);
      expect(update?.[0]).not.toContain("estado_resenia_id");
      expect(update?.[1]).toEqual([center.id]);
      expect(
        fixture.query.mock.calls.some(([sql]) =>
          sql.includes("FROM estados_resenia WHERE codigo"),
        ),
      ).toBe(false);
      expect(fixture.query).toHaveBeenCalledWith(
        expect.stringContaining("INSERT INTO auditoria_fichas"),
        [
          center.id,
          99,
          next ? "REACTIVAR" : "DESACTIVAR",
          null,
          JSON.stringify({ activo: active }),
          JSON.stringify({ activo: next }),
        ],
      );
    },
  );

  it("does not approve a center when there is no pending revision", async () => {
    const query = vi
      .fn()
      .mockResolvedValueOnce([{ id: center.id }])
      .mockResolvedValueOnce([center])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([]);
    const service = serviceWithManager(query);

    await expect(
      service.review(center.code, 99, { action: "APPROVE" }),
    ).rejects.toThrow("ya no está en revisión");
  });

  it("does not let the legacy publish endpoint bypass approval", async () => {
    const draft = {
      id: "8",
      stateCode: "BORRADOR",
      stateName: "Borrador",
      version: 2,
      data: {},
    };
    const query = vi
      .fn()
      .mockResolvedValueOnce([{ id: center.id }])
      .mockResolvedValueOnce([center])
      .mockResolvedValueOnce([draft]);
    const service = serviceWithManager(query);

    await expect(service.publish(center.code, 99)).rejects.toThrow(
      "Aprueba la revisión para publicar",
    );
  });

  it.each(["save", "saveSection"])(
    "rejects %s while a center is being reviewed before reading published details",
    async (operation) => {
      const draft = {
        id: "8",
        stateCode: "EN_REVISION",
        stateName: "En revisión",
        version: 2,
        data: {},
      };
      const query = vi
        .fn()
        .mockResolvedValueOnce([{ id: center.id }])
        .mockResolvedValueOnce([center])
        .mockResolvedValueOnce([draft]);
      const service = serviceWithManager(query);

      await expect(
        operation === "save"
          ? service.save(center.code, 99, { name: "Cambio concurrente" })
          : service.saveSection(center.code, "descripcion", 99, {
              content: {},
            }),
      ).rejects.toThrow("no se puede editar");
      expect(query).toHaveBeenCalledTimes(3);
    },
  );

  it.each(["save", "saveSection"])(
    "rejects a stale %s version before reading published details",
    async (operation) => {
      const query = vi
        .fn()
        .mockResolvedValueOnce([{ id: center.id }])
        .mockResolvedValueOnce([center])
        .mockResolvedValueOnce([
          {
            id: "8",
            stateCode: "BORRADOR",
            stateName: "Borrador",
            version: 2,
            data: {},
          },
        ]);
      const service = serviceWithManager(query);
      await expect(
        operation === "save"
          ? service.save(center.code, 99, {
              version: 1,
              name: "Cambio concurrente",
            })
          : service.saveSection(center.code, "descripcion", 99, {
              version: 1,
              content: {},
            }),
      ).rejects.toThrow("La ficha cambió mientras la editabas");
      expect(query).toHaveBeenCalledTimes(3);
    },
  );
});
