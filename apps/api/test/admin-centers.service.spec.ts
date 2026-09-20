import { describe, expect, it, vi } from "vitest";

import { AdminCentersService } from "../src/admin/admin-centers.service";

describe("AdminCentersService", () => {
  it("publishes the visitor section across its normalized relations", async () => {
    const managerQuery = vi.fn(async (sql: string) =>
      sql.includes("RETURNING id") ? [{ id: "50" }] : [],
    );
    const manager = { query: managerQuery };
    const service = new AdminCentersService({} as never);
    const applyVisitorsSection = (
      service as unknown as {
        applyVisitorsSection: (
          value: typeof manager,
          centerId: string,
          section: Record<string, unknown>,
        ) => Promise<void>;
      }
    ).applyVisitorsSection;

    await applyVisitorsSection.call(service, manager, "10", {
      response: "SI",
      visitors: {
        registry: { exists: "SI", reports: "NO", type: "DIGITAL" },
        seasons: [{ type: "ALTA", year: 2025, months: [7, 8] }],
        origins: [{ type: "NACIONAL", place: "Guaranda", month: 7 }],
        informants: [{ name: "Ana Pérez" }],
        influx: { weekday: 10, frequency: "PERMANENTE" },
      },
    });

    const statements = managerQuery.mock.calls.map(([sql]) => sql);
    expect(statements).toEqual(
      expect.arrayContaining([
        expect.stringContaining("INSERT INTO registros_visitantes"),
        expect.stringContaining("INSERT INTO temporadas_visitacion"),
        expect.stringContaining("INSERT INTO temporada_meses"),
        expect.stringContaining("INSERT INTO procedencias_visitantes"),
        expect.stringContaining("INSERT INTO informantes_clave"),
        expect.stringContaining("INSERT INTO afluencia_visitantes"),
      ]),
    );
  });

  it("publishes policy answers through the active policy catalog", async () => {
    const managerQuery = vi.fn(async (sql: string) =>
      sql.includes("SELECT id, codigo")
        ? [{ id: "71", codigo: "PLAN_DESARROLLO_GAD" }]
        : [],
    );
    const manager = { query: managerQuery };
    const service = new AdminCentersService({} as never);
    const applyPoliciesSection = (
      service as unknown as {
        applyPoliciesSection: (
          value: typeof manager,
          centerId: string,
          section: Record<string, unknown>,
        ) => Promise<void>;
      }
    ).applyPoliciesSection;

    await applyPoliciesSection.call(service, manager, "10", {
      response: "SI",
      policies: [
        {
          code: "PLAN_DESARROLLO_GAD",
          response: "SI",
          year: 2025,
          specification: "Incluido",
        },
      ],
    });

    expect(managerQuery.mock.calls.map(([sql]) => sql)).toEqual(
      expect.arrayContaining([
        expect.stringContaining("SELECT id, codigo FROM preguntas_politica"),
        expect.stringContaining("INSERT INTO respuestas_politica_centro"),
      ]),
    );
  });

  it("publishes the institutional promotion plan", async () => {
    const managerQuery = vi.fn().mockResolvedValue([]);
    const manager = { query: managerQuery };
    const service = new AdminCentersService({} as never);
    const applyPromotionSection = (
      service as unknown as {
        applyPromotionSection: (
          value: typeof manager,
          centerId: string,
          section: Record<string, unknown>,
        ) => Promise<void>;
      }
    ).applyPromotionSection;

    await applyPromotionSection.call(service, manager, "10", {
      response: "SI",
      promotion: {
        hasPlan: "SI",
        planName: "Plan anual",
        includedInPlan: "NO",
        partOfPackage: "SI",
        packageDetail: "Ruta cultural",
      },
    });

    expect(managerQuery).toHaveBeenCalledWith(
      expect.stringContaining("INSERT INTO promocion_centro_turistico"),
      expect.arrayContaining(["10", true, "Plan anual", false, true]),
    );
  });

  it("publishes the human-resources summary without inventing training types", async () => {
    const managerQuery = vi.fn().mockResolvedValue([]);
    const manager = { query: managerQuery };
    const service = new AdminCentersService({} as never);
    const applyHumanResourcesSection = (
      service as unknown as {
        applyHumanResourcesSection: (
          value: typeof manager,
          centerId: string,
          section: Record<string, unknown>,
        ) => Promise<void>;
      }
    ).applyHumanResourcesSection;

    await applyHumanResourcesSection.call(service, manager, "10", {
      response: "SI",
      humanResources: {
        summary: {
          administrationOperation: 3,
          specializedTourism: 2,
          observation: "Equipo permanente",
        },
        training: [],
      },
    });

    expect(managerQuery).toHaveBeenCalledWith(
      expect.stringContaining("INSERT INTO resumen_recurso_humano"),
      ["10", 3, 2, "Equipo permanente"],
    );
  });

  it("publishes conservation states and declarations through existing tables", async () => {
    const managerQuery = vi.fn(async (sql: string) => {
      if (sql.includes("FROM estados_conservacion")) {
        return [
          { id: "81", codigo: "CONSERVADO" },
          { id: "82", codigo: "ALTERADO" },
        ];
      }
      if (sql.includes("FROM componentes_conservacion")) {
        return [
          { id: "1", codigo: "ATRACTIVO" },
          { id: "2", codigo: "ENTORNO" },
        ];
      }
      return [];
    });
    const manager = { query: managerQuery };
    const service = new AdminCentersService({} as never);
    const applyConservationSection = (
      service as unknown as {
        applyConservationSection: (
          value: typeof manager,
          centerId: string,
          section: Record<string, unknown>,
        ) => Promise<void>;
      }
    ).applyConservationSection;

    await applyConservationSection.call(service, manager, "10", {
      response: "SI",
      conservation: {
        attraction: { state: "CONSERVADO", observation: "Estable" },
        environment: { state: "ALTERADO", observation: "Presión de uso" },
        factors: [],
      },
      declarations: [
        {
          entity: "GAD",
          denomination: "Patrimonio local",
          date: "2024-05-01",
        },
      ],
    });

    const statements = managerQuery.mock.calls.map(([sql]) => sql);
    expect(statements).toEqual(
      expect.arrayContaining([
        expect.stringContaining("INSERT INTO evaluaciones_conservacion"),
        expect.stringContaining("INSERT INTO declaratorias_turisticas"),
      ]),
    );
  });

  it("publishes portable radios and the contingency plan", async () => {
    const managerQuery = vi.fn().mockResolvedValue([]);
    const manager = { query: managerQuery };
    const service = new AdminCentersService({} as never);
    const applyHygieneSection = (
      service as unknown as {
        applyHygieneSection: (
          value: typeof manager,
          centerId: string,
          section: Record<string, unknown>,
        ) => Promise<void>;
      }
    ).applyHygieneSection;

    await applyHygieneSection.call(service, manager, "10", {
      response: "SI",
      hygieneSafety: {
        entries: [],
        radios: {
          available: "SI",
          visitorUse: "NO",
          internalUse: "SI",
          emergencyUse: "SI",
          quantity: 2,
        },
        contingency: {
          exists: "SI",
          institution: "GAD",
          document: "Plan 2025",
          year: 2025,
        },
      },
    });

    const statements = managerQuery.mock.calls.map(([sql]) => sql);
    expect(statements).toEqual(
      expect.arrayContaining([
        expect.stringContaining("INSERT INTO radios_portatiles_centro"),
        expect.stringContaining("INSERT INTO planes_contingencia"),
      ]),
    );
  });

  it("publishes accessibility survey and GAD validation metadata", async () => {
    const managerQuery = vi.fn().mockResolvedValue([]);
    const manager = { query: managerQuery };
    const service = new AdminCentersService({} as never);
    const applyAnnexesSection = (
      service as unknown as {
        applyAnnexesSection: (
          value: typeof manager,
          centerId: string,
          section: Record<string, unknown>,
        ) => Promise<void>;
      }
    ).applyAnnexesSection;

    await applyAnnexesSection.call(service, manager, "10", {
      response: "SI",
      annexes: {
        documents: [],
        responsibles: [],
        accessibilitySurvey: {
          date: "2025-01-15",
          responsible: "Ana Pérez",
          scope: "GAD Guaranda",
          observation: "Levantamiento de campo",
        },
        gadValidation: {
          acceptance: "SI",
          name: "Luis Gómez",
          institution: "GAD Guaranda",
          position: "Director",
        },
      },
    });

    const statements = managerQuery.mock.calls.map(([sql]) => sql);
    expect(statements).toEqual(
      expect.arrayContaining([
        expect.stringContaining("INSERT INTO levantamientos_accesibilidad"),
        expect.stringContaining("INSERT INTO validaciones_gad"),
      ]),
    );
  });

  it("exposes persisted valuation status without recalculating the ficha", async () => {
    const managerQuery = vi
      .fn()
      .mockResolvedValueOnce([
        { id: "10", hierarchyId: 2, hierarchyCode: "02" },
      ])
      .mockResolvedValueOnce([{ count: "3" }])
      .mockResolvedValueOnce([
        {
          code: "A",
          name: "Ubicación",
          maximum: "20",
          score: "18.5",
          appliedMaximum: "20",
        },
      ])
      .mockResolvedValueOnce([{ total: "48.7" }]);
    const manager = { query: managerQuery };
    const service = new AdminCentersService({
      transaction: vi.fn(async (callback: (value: typeof manager) => unknown) =>
        callback(manager),
      ),
    } as never);

    await expect(service.valuation("EC-001")).resolves.toEqual({
      configured: true,
      total: 48.7,
      hierarchyCode: "02",
      hierarchyId: 2,
      criteria: [
        {
          code: "A",
          name: "Ubicación",
          maximum: 20,
          score: 18.5,
          appliedMaximum: 20,
        },
      ],
    });
    expect(managerQuery).toHaveBeenCalledTimes(4);
  });

  it("rejects valuation status for an unknown ficha", async () => {
    const manager = { query: vi.fn().mockResolvedValue([]) };
    const service = new AdminCentersService({
      transaction: vi.fn(async (callback: (value: typeof manager) => unknown) =>
        callback(manager),
      ),
    } as never);

    await expect(service.valuation("UNKNOWN")).rejects.toThrow(
      "No se encontró la ficha turística.",
    );
  });

  it("returns inventory summary counts grouped by review state", async () => {
    const dataSource = {
      query: vi.fn().mockResolvedValue([
        { code: "PUBLICADO", name: "Publicado", total: 4, active: 3 },
        { code: "EN_REVISION", name: "En revisión", total: 2, active: 2 },
      ]),
    };
    const service = new AdminCentersService(dataSource as never);

    await expect(service.summary()).resolves.toEqual({
      total: 6,
      active: 5,
      pendingReview: 2,
      published: 4,
      inactive: 1,
      byStatus: [
        { code: "PUBLICADO", name: "Publicado", total: 4, active: 3 },
        { code: "EN_REVISION", name: "En revisión", total: 2, active: 2 },
      ],
    });
  });

  it("includes activity state in the paginated center list", async () => {
    const dataSource = {
      query: vi.fn().mockResolvedValue([
        {
          code: "EC-001",
          name: "Centro de prueba",
          statusCode: "PUBLICADO",
          statusName: "Publicado",
          updatedAt: "2026-09-18T00:00:00.000Z",
          submittedAt: null,
          requestedBy: null,
          observation: null,
          active: false,
          total: "1",
        },
      ]),
    };
    const service = new AdminCentersService(dataSource as never);

    await expect(
      service.list({ limit: 20, offset: 0 } as never),
    ).resolves.toMatchObject({
      total: 1,
      items: [{ code: "EC-001", active: false }],
    });
    expect(dataSource.query).toHaveBeenCalledWith(
      expect.stringContaining("c.activo AS active"),
      [20, 0],
    );
  });

  it("updates a technical catalog option and records the change", async () => {
    const managerQuery = vi
      .fn()
      .mockResolvedValueOnce([
        { id: "2", code: "MIRADOR", name: "Mirador", active: true },
      ])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([
        { id: "2", code: "MIRADOR", name: "Mirador panorámico", active: false },
      ])
      .mockResolvedValueOnce([]);
    const manager = { query: managerQuery };
    const service = new AdminCentersService({
      transaction: vi.fn(async (callback: (value: typeof manager) => unknown) =>
        callback(manager),
      ),
    } as never);

    await expect(
      service.updateCatalog(7, "FACILITY", 2, {
        name: "Mirador panorámico",
        active: false,
      }),
    ).resolves.toEqual({
      catalog: "FACILITY",
      id: 2,
      code: "MIRADOR",
      name: "Mirador panorámico",
      active: false,
    });
    expect(managerQuery).toHaveBeenCalledWith(
      expect.stringContaining("INSERT INTO auditoria_catalogos"),
      expect.arrayContaining([7, "FACILITY", 2, "DESACTIVAR"]),
    );
  });
});
