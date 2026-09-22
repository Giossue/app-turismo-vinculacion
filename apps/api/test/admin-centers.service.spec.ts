import { describe, expect, it, vi } from "vitest";

import { AdminCentersService } from "../src/admin/admin-centers.service";
import { XLSM_INDICATOR_CODES } from "../src/admin/valuation";

describe("AdminCentersService", () => {
  it("updates establishment classification visuals and audits the change", async () => {
    const managerQuery = vi
      .fn()
      .mockResolvedValueOnce([
        {
          id: "12",
          code: "CLAS_HOTEL",
          name: "Hotel",
          active: true,
          activityId: "3",
          icon: "shop-supermarket",
          color: "#be123c",
        },
      ])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([]);
    const manager = { query: managerQuery };
    const transaction = vi.fn(
      async (callback: (value: typeof manager) => unknown) => callback(manager),
    );
    const service = new AdminCentersService({ transaction } as never);

    await expect(
      service.updateCatalog(7, "ESTABLISHMENT_CLASSIFICATION", 12, {
        icon: "accommodation-hotel",
      }),
    ).resolves.toMatchObject({
      catalog: "ESTABLISHMENT_CLASSIFICATION",
      id: 12,
      icon: "accommodation-hotel",
      color: "#7a5c3e",
    });
    expect(managerQuery.mock.calls[2]).toEqual([
      expect.stringContaining("icono = $4"),
      [12, "Hotel", true, "accommodation-hotel", "#7a5c3e"],
    ]);
    expect(managerQuery).toHaveBeenLastCalledWith(
      expect.stringContaining("INSERT INTO auditoria_catalogos"),
      expect.arrayContaining([
        7,
        "ESTABLISHMENT_CLASSIFICATION",
        12,
        "MODIFICAR",
        expect.stringContaining("shop-supermarket"),
        expect.stringContaining("accommodation-hotel"),
      ]),
    );
  });

  it("rejects manual establishment marker colors", async () => {
    const service = new AdminCentersService({} as never);

    await expect(
      service.updateCatalog(7, "ESTABLISHMENT_CLASSIFICATION", 12, {
        color: "#ffffff",
      } as never),
    ).rejects.toThrow("se asigna automáticamente");
  });

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

  it("publishes promotion media through the existing typed relation", async () => {
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
        hasPlan: "NO",
        includedInPlan: "NO",
        partOfPackage: "NO",
        media: [
          {
            response: "SI",
            typeId: 8,
            name: "Facebook institucional",
            url: "https://example.com/guaranda",
            periodicity: "Mensual",
          },
        ],
      },
    });

    expect(managerQuery).toHaveBeenCalledWith(
      expect.stringContaining("INSERT INTO medios_promocion_centro_turistico"),
      expect.arrayContaining(["10", 8, "Facebook institucional"]),
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

  it("publishes typed human-resources training rows", async () => {
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
        training: [
          {
            typeId: 12,
            quantity: 4,
            detailOther: "",
            observation: "Curso vigente",
          },
        ],
      },
    });

    expect(managerQuery).toHaveBeenCalledWith(
      expect.stringContaining("INSERT INTO formacion_personal_centro"),
      ["10", 12, 4, "", "Curso vigente"],
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

  it("publishes conservation factors through their typed catalog relation", async () => {
    const managerQuery = vi.fn(async (sql: string) => {
      if (sql.includes("FROM estados_conservacion")) {
        return [
          { id: "81", codigo: "CONSERVADO" },
          { id: "82", codigo: "ALTERADO" },
        ];
      }
      if (
        sql.includes("FROM componentes_conservacion") &&
        sql.includes("WHERE codigo = ANY")
      ) {
        return [
          { id: "1", codigo: "ATRACTIVO" },
          { id: "2", codigo: "ENTORNO" },
        ];
      }
      if (sql.includes("FROM evaluaciones_conservacion ev")) {
        return [
          { id: "91", codigo: "ATRACTIVO" },
          { id: "92", codigo: "ENTORNO" },
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
        attraction: { state: "CONSERVADO" },
        environment: { state: "ALTERADO" },
        factors: [
          {
            component: "ATRACTIVO",
            factorId: 44,
            origin: "NATURAL",
            response: "SI",
            detailOther: "Humedad permanente",
          },
        ],
      },
    });

    expect(managerQuery).toHaveBeenCalledWith(
      expect.stringContaining("INSERT INTO evaluacion_factores_alteracion"),
      ["91", 44, true, "Humedad permanente", null],
    );
  });

  it("requires uploaded document references before publishing annexes", async () => {
    const service = new AdminCentersService({} as never);
    const validateAnnexes = (
      service as unknown as {
        validateAnnexesSectionReferences: (
          manager: { query: ReturnType<typeof vi.fn> },
          draft: Record<string, unknown>,
          centerId: string,
        ) => Promise<void>;
      }
    ).validateAnnexesSectionReferences;
    const manager = { query: vi.fn().mockResolvedValue([]) };

    await expect(
      validateAnnexes.call(
        service,
        manager,
        {
          sections: {
            anexos: {
              response: "SI",
              annexes: { documents: [{ type: "MAPA" }] },
            },
          },
        },
        "10",
      ),
    ).rejects.toThrow("requiere seleccionar un archivo");

    await expect(
      validateAnnexes.call(
        service,
        manager,
        {
          sections: {
            anexos: {
              response: "SI",
              annexes: { documents: [{ fileId: 22, type: "MAPA" }] },
            },
          },
        },
        "10",
      ),
    ).rejects.toThrow("no está disponible");
    expect(manager.query).toHaveBeenCalledWith(
      expect.stringContaining("archivos_centro_turistico"),
      ["10", [22]],
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

  it("publishes hygiene rows through their typed catalog relations", async () => {
    const managerQuery = vi.fn(async (sql: string) => {
      if (sql.includes("FROM ambitos_ubicacion_servicio")) {
        return [{ id: "21", codigo: "EN_ATRACTIVO" }];
      }
      if (sql.includes("FROM estados_condicion")) {
        return [{ id: "31", codigo: "BUENO" }];
      }
      return [];
    });
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
        entries: [
          {
            kind: "BASIC_SERVICE",
            scope: "EN_ATRACTIVO",
            typeId: 41,
            response: "SI",
            provider: "Empresa pública",
            secondary: "Red disponible",
          },
          {
            kind: "SIGNAGE",
            typeId: 42,
            secondaryId: 43,
            quantity: 2,
            condition: "BUENO",
            response: "SI",
          },
          {
            kind: "THREAT",
            typeId: 44,
            response: "NO",
          },
        ],
      },
    });

    const statements = managerQuery.mock.calls.map(([sql]) => sql);
    expect(statements).toEqual(
      expect.arrayContaining([
        expect.stringContaining("INSERT INTO servicios_basicos_centro"),
        expect.stringContaining("INSERT INTO senaletica_centro"),
        expect.stringContaining("INSERT INTO amenazas_centro"),
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

  it("publishes typed ficha responsibilities", async () => {
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
        responsibles: [
          {
            typeId: 2,
            name: "Ana Pérez",
            institution: "GAD Guaranda",
            role: "Técnica",
          },
        ],
      },
    });

    expect(managerQuery).toHaveBeenCalledWith(
      expect.stringContaining("INSERT INTO responsables_ficha"),
      expect.arrayContaining(["10", 2, "Ana Pérez", "GAD Guaranda"]),
    );
  });

  it("exposes persisted valuation status without recalculating the ficha", async () => {
    const managerQuery = vi
      .fn()
      .mockResolvedValueOnce([
        { id: "10", hierarchyId: 2, hierarchyCode: "02" },
      ])
      .mockResolvedValueOnce([{ count: "56", requiredCount: "56" }])
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

  it("persists the typed XLSM valuation with auditable indicator details", async () => {
    const criterionCodes = ["A", "B", "C", "D", "E", "F", "G", "H", "I"];
    const criterionRows = criterionCodes.map((code, index) => ({
      id: String(index + 1),
      code,
      maximum: [18, 18, 14, 14, 10, 9, 7, 5, 5][index],
    }));
    const indicatorRows = XLSM_INDICATOR_CODES.map((code, index) => ({
      id: String(index + 10),
      code,
      criterionId: String(criterionCodes.indexOf(code.slice(0, 1)) + 1),
      criterionCode: code.slice(0, 1),
      maximum: 9,
    }));
    const managerQuery = vi.fn(async (sql: string) => {
      if (sql.includes("FROM indicadores_valoracion")) return indicatorRows;
      if (sql.includes("FROM criterios_valoracion")) return criterionRows;
      return [];
    });
    const manager = { query: managerQuery };
    const service = new AdminCentersService({} as never);
    const persistXlsmValuation = (
      service as unknown as {
        persistXlsmValuation: (
          value: typeof manager,
          centerId: string,
          draft: Record<string, unknown>,
        ) => Promise<boolean>;
      }
    ).persistXlsmValuation;

    await expect(
      persistXlsmValuation.call(service, manager, "10", {
        activities: [],
        sections: {
          accesibilidad: { response: "NO_APLICA" },
          planta: { response: "NO_APLICA" },
          conservacion: { response: "NO_APLICA" },
          "higiene-seguridad": { response: "NO_APLICA" },
          politicas: { response: "NO_APLICA" },
          promocion: {
            response: "SI",
            promotion: {
              hasPlan: "SI",
              includedInPlan: "SI",
              partOfPackage: "NO",
            },
          },
          visitantes: { response: "NO_APLICA" },
          "recurso-humano": { response: "NO_APLICA" },
        },
      }),
    ).resolves.toBe(true);

    const statements = managerQuery.mock.calls.map(([sql]) => sql);
    expect(statements).toContainEqual(
      expect.stringContaining("DELETE FROM resultados_indicador"),
    );
    expect(statements).toContainEqual(
      expect.stringContaining("DELETE FROM resultados_criterio"),
    );
    expect(statements).toContainEqual(
      expect.stringContaining("INSERT INTO resultados_indicador"),
    );
    expect(statements).toContainEqual(
      expect.stringContaining("INSERT INTO resultados_criterio"),
    );
    const indicatorInsert = managerQuery.mock.calls.find(([sql]) =>
      sql.includes("INSERT INTO resultados_indicador"),
    );
    const indicatorValues = (indicatorInsert as unknown[] | undefined)?.[1] as
      unknown[] | undefined;
    expect(indicatorValues?.[4]).toContain('"source":"XLSM"');
  });

  it("does not calculate against a partial XLSM catalog", async () => {
    const manager = {
      query: vi.fn(async (sql: string) =>
        sql.includes("FROM indicadores_valoracion")
          ? [
              {
                id: "1",
                code: "A.TRANSPORT",
                criterionId: "1",
                criterionCode: "A",
                maximum: 9,
              },
            ]
          : [],
      ),
    };
    const service = new AdminCentersService({} as never);
    const persistXlsmValuation = (
      service as unknown as {
        persistXlsmValuation: (
          value: typeof manager,
          centerId: string,
          draft: Record<string, unknown>,
        ) => Promise<boolean>;
      }
    ).persistXlsmValuation;

    await expect(
      persistXlsmValuation.call(service, manager, "10", {}),
    ).rejects.toThrow("catálogo de valoración XLSM está incompleto");
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

  it("keeps published sections when the draft snapshot omits them", () => {
    const service = new AdminCentersService({} as never);
    const mergeDraftWithPublished = (
      service as unknown as {
        mergeDraftWithPublished: (
          published: Record<string, unknown>,
          draft: Record<string, unknown>,
        ) => Record<string, unknown>;
      }
    ).mergeDraftWithPublished;

    expect(
      mergeDraftWithPublished.call(
        service,
        {
          name: "Ficha publicada",
          sections: {
            accesibilidad: { response: "SI" },
            planta: { response: "SI" },
          },
        },
        {
          name: "Propuesta aprobada",
          sections: { accesibilidad: { response: "NO" } },
        },
      ),
    ).toMatchObject({
      name: "Propuesta aprobada",
      sections: {
        accesibilidad: { response: "NO" },
        planta: { response: "SI" },
      },
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

  it("uses the review queue filter for pending and approved fichas", async () => {
    const dataSource = {
      query: vi.fn().mockResolvedValue([]),
    };
    const service = new AdminCentersService(dataSource as never);

    await expect(
      service.list({ status: "REVIEW_QUEUE", limit: 20, offset: 0 } as never),
    ).resolves.toMatchObject({ total: 0, items: [] });
    expect(dataSource.query).toHaveBeenCalledWith(
      expect.stringContaining(
        "inventory.status_code IN ('EN_REVISION', 'APROBADO')",
      ),
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

  it("keeps DPA and classification catalogs outside the editable whitelist", async () => {
    const service = new AdminCentersService({} as never);

    await expect(
      service.updateCatalog(7, "PROVINCE", 1, { name: "Bolívar" }),
    ).rejects.toThrow("El catálogo no está disponible.");
    await expect(
      service.updateCatalog(7, "SUBTYPE", 1, { active: false }),
    ).rejects.toThrow("El catálogo no está disponible.");
  });

  it("exposes the institutional catalogs used by the structured sections", async () => {
    const dataSource = {
      query: vi.fn(async (sql: string) => {
        if (sql.includes("FROM factores_alteracion")) {
          return [
            { id: "4", code: "EROSION", name: "Erosión", origin: "NATURAL" },
          ];
        }
        if (sql.includes("FROM tipos_medio_promocion")) {
          return [{ id: "8", code: "WEB", name: "Página web" }];
        }
        if (sql.includes("FROM meses")) {
          return [{ id: "7", code: "7", name: "Julio" }];
        }
        return [];
      }),
    };
    const service = new AdminCentersService(dataSource as never);

    await expect(service.catalogs()).resolves.toMatchObject({
      conservationFactors: [{ id: "4", code: "EROSION", origin: "NATURAL" }],
      promotionMediaTypes: [{ id: "8", code: "WEB" }],
      months: [{ id: "7", code: "7" }],
    });
    expect(dataSource.query).toHaveBeenCalledWith(
      expect.stringContaining("FROM tipos_responsabilidad_ficha"),
      [null],
    );
    expect(dataSource.query).toHaveBeenCalledWith(
      expect.stringContaining("FROM tipos_formacion_personal"),
      [null],
    );
  });
});
