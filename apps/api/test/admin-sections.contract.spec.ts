import { describe, expect, it } from "vitest";

import {
  buildAdminSectionProgress,
  getAdminSectionProgress,
  validateAdminSectionContent,
} from "../src/admin/admin-centers.service";

describe("admin section contract", () => {
  it("accepts the four-state structured payload with repeatable rows", () => {
    expect(
      validateAdminSectionContent({
        schemaVersion: 1,
        response: "SI",
        observation: "Verificado en visita de campo.",
        localityId: 3,
        distanceKm: 4.5,
        climate: {
          climateId: 2,
          minTemperature: 8,
          maxTemperature: 22,
          minRainfall: 100,
          maxRainfall: 600,
        },
        rows: [
          {
            label: "Vía terrestre",
            response: "SI",
            quantity: 0,
            observation: "No hay vía acuática.",
          },
        ],
      }),
    ).toBeNull();
  });

  it("rejects invalid responses, labels and quantities at the API boundary", () => {
    expect(
      validateAdminSectionContent({
        schemaVersion: 1,
        response: "MAYBE",
        rows: [{ label: "", response: "SI", quantity: -1 }],
      }),
    ).toContain("respuesta válida");
    expect(
      validateAdminSectionContent({
        schemaVersion: 1,
        response: "SI",
        rows: [{ label: "Vía", response: "SI", quantity: 1.5 }],
      }),
    ).toContain("enteros");
    expect(
      validateAdminSectionContent({
        schemaVersion: 1,
        response: "SI",
        localityId: 0,
        distanceKm: -1,
        rows: [],
      }),
    ).toContain("localidad");
    expect(
      validateAdminSectionContent({
        schemaVersion: 1,
        response: "SI",
        climate: {
          climateId: 2,
          minTemperature: 24,
          maxTemperature: 10,
        },
        rows: [],
      }),
    ).toContain("temperatura mínima");
  });

  it("keeps legacy section objects readable while marking them incomplete", () => {
    const legacy = { localidadCercana: { localidadId: 3 } };

    expect(validateAdminSectionContent(legacy)).toBeNull();
    expect(getAdminSectionProgress(legacy)).toBe("INCOMPLETA");
  });

  it("validates structured conservation components, factors and declarations", () => {
    expect(
      validateAdminSectionContent({
        schemaVersion: 1,
        response: "SI",
        conservation: {
          attraction: {
            state: "CONSERVADO",
            observation: "La estructura se mantiene estable.",
          },
          environment: { state: "ALTERADO" },
          factors: [
            {
              origin: "NATURAL",
              name: "Humedad",
              response: "NO",
              observation: "No se observó durante la visita.",
            },
          ],
        },
        declarations: [
          {
            entity: "GAD Municipal",
            denomination: "Patrimonio local",
            date: "2024-05-10",
            scope: "Cantonal",
          },
        ],
      }),
    ).toBeNull();
  });

  it("rejects invalid conservation states, factors and declaration dates", () => {
    expect(
      validateAdminSectionContent({
        schemaVersion: 1,
        response: "SI",
        conservation: {
          attraction: { state: "DESCONOCIDO" },
          factors: [{ origin: "OTRO", name: "Humedad", response: "SI" }],
        },
      }),
    ).toContain("estado de conservación");
    expect(
      validateAdminSectionContent({
        schemaVersion: 1,
        response: "SI",
        conservation: {
          factors: [{ origin: "NATURAL", name: "Humedad", response: "MAYBE" }],
        },
      }),
    ).toContain("factor de alteración requiere una respuesta");
    expect(
      validateAdminSectionContent({
        schemaVersion: 1,
        response: "SI",
        declarations: [
          { entity: "GAD", denomination: "Patrimonio", date: "2024-99-99" },
        ],
      }),
    ).toContain("fecha de declaratoria");
  });

  it("marks conservation incomplete until both components have a state", () => {
    expect(
      getAdminSectionProgress({
        schemaVersion: 1,
        response: "SI",
        conservation: {
          attraction: { state: "CONSERVADO" },
          environment: { state: null },
        },
      }),
    ).toBe("INCOMPLETA");
  });

  it("validates hygiene, safety and contingency records", () => {
    expect(
      validateAdminSectionContent({
        schemaVersion: 1,
        response: "SI",
        hygieneSafety: {
          entries: [
            {
              kind: "BASIC_SERVICE",
              scope: "EN_ATRACTIVO",
              name: "Agua potable",
              response: "SI",
              quantity: 1,
            },
            {
              kind: "SIGNAGE",
              name: "Panel informativo",
              response: "SI",
              condition: "BUENO",
              quantity: 2,
            },
          ],
          radios: {
            available: "NO",
            visitorUse: "NO_APLICA",
            internalUse: "NO",
            emergencyUse: "NO",
            quantity: 0,
          },
          contingency: {
            exists: "SI",
            institution: "GAD Municipal",
            document: "Plan anual",
            year: 2025,
          },
        },
      }),
    ).toBeNull();
  });

  it("rejects invalid hygiene entry kind and radio quantity", () => {
    expect(
      validateAdminSectionContent({
        schemaVersion: 1,
        response: "SI",
        hygieneSafety: {
          entries: [
            { kind: "UNKNOWN", name: "Registro", response: "SI" },
          ],
        },
      }),
    ).toContain("tipo de registro");
    expect(
      validateAdminSectionContent({
        schemaVersion: 1,
        response: "SI",
        hygieneSafety: {
          radios: {
            available: "SI",
            visitorUse: "SI",
            internalUse: "SI",
            emergencyUse: "SI",
            quantity: -1,
          },
        },
      }),
    ).toContain("cantidad de radios");
  });

  it("validates the four institutional policy responses", () => {
    expect(
      validateAdminSectionContent({
        schemaVersion: 1,
        response: "SI",
        policies: [
          {
            code: "PLAN_DESARROLLO_GAD",
            question: "¿Está incluido en el plan del GAD?",
            response: "SI",
            year: 2025,
            specification: "Objetivo turístico cantonal",
          },
          {
            code: "PLANIFICACION_TERRITORIAL",
            response: "NO",
          },
        ],
      }),
    ).toBeNull();
    expect(
      validateAdminSectionContent({
        schemaVersion: 1,
        response: "SI",
        policies: [
          { code: "PLAN_DESARROLLO_GAD", response: "SI" },
          { code: "PLAN_DESARROLLO_GAD", response: "NO" },
        ],
      }),
    ).toContain("repetido");
  });

  it("validates promotion decisions and media URLs", () => {
    expect(
      validateAdminSectionContent({
        schemaVersion: 1,
        response: "SI",
        promotion: {
          hasPlan: "SI",
          planName: "Plan de promoción anual",
          includedInPlan: "SI",
          partOfPackage: "NO",
          media: [
            {
              response: "SI",
              name: "Página web institucional",
              url: "https://turismo.gob.ec/ficha",
            },
          ],
        },
      }),
    ).toBeNull();
    expect(
      validateAdminSectionContent({
        schemaVersion: 1,
        response: "SI",
        promotion: {
          hasPlan: "SI",
          includedInPlan: "SI",
          partOfPackage: "NO",
          media: [{ response: "SI", url: "javascript:alert(1)" }],
        },
      }),
    ).toContain("HTTP o HTTPS");
  });

  it("validates visitors, seasons, origins, informants and influx", () => {
    expect(
      validateAdminSectionContent({
        schemaVersion: 1,
        response: "SI",
        visitors: {
          registry: {
            exists: "SI",
            type: "DIGITAL",
            years: 3,
            reports: "SI",
            frequency: "Mensual",
          },
          seasons: [{ type: "ALTA", quantity: 120, year: 2025, months: [7, 8] }],
          origins: [
            { type: "NACIONAL", place: "Guaranda", month: 8, year: 2025, quantity: 80 },
          ],
          informants: [{ name: "Ana Pérez", contact: "0999999999" }],
          influx: {
            weekday: 10,
            weekend: 35,
            holidays: 60,
            frequency: "ESTACIONAL",
          },
        },
      }),
    ).toBeNull();
  });

  it("rejects repeated or out-of-range visitor months", () => {
    expect(
      validateAdminSectionContent({
        schemaVersion: 1,
        response: "SI",
        visitors: {
          seasons: [{ type: "ALTA", months: [1, 1] }],
        },
      }),
    ).toContain("no pueden repetirse");
    expect(
      validateAdminSectionContent({
        schemaVersion: 1,
        response: "SI",
        visitors: {
          origins: [{ type: "NACIONAL", place: "Guaranda", month: 13 }],
        },
      }),
    ).toContain("mes de procedencia");
  });

  it("derives core progress and explicit no aplica states", () => {
    const progress = buildAdminSectionProgress({
      name: "Centro de prueba",
      subtypeId: 1,
      touristZoneId: 1,
      parishId: 1,
      productLineId: 1,
      scenarioId: 1,
      hierarchyId: 1,
      latitude: -1.59,
      longitude: -79.0,
      description: "Descripción",
      accessibility: [],
      activities: [],
      facilities: [],
      sections: {
        conservacion: {
          schemaVersion: 1,
          response: "NO_APLICA",
          rows: [],
        },
      },
    });

    expect(
      progress.find((item) => item.code === "identificacion")?.status,
    ).toBe("COMPLETA");
    expect(progress.find((item) => item.code === "conservacion")?.status).toBe(
      "NO_APLICA",
    );
    expect(progress.find((item) => item.code === "promocion")?.status).toBe(
      "SIN_INICIAR",
    );
  });
});
