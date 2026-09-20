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
  });

  it("keeps legacy section objects readable while marking them incomplete", () => {
    const legacy = { localidadCercana: { localidadId: 3 } };

    expect(validateAdminSectionContent(legacy)).toBeNull();
    expect(getAdminSectionProgress(legacy)).toBe("INCOMPLETA");
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
