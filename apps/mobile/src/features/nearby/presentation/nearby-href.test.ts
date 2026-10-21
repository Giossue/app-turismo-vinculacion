import { describe, expect, it } from "vitest";

import { buildNearbyHref, parseNearbySearchParams } from "./nearby-href";

describe("nearby href", () => {
  it("sin punto abre la búsqueda por GPS", () => {
    expect(buildNearbyHref()).toBe("/nearby");
  });

  it("ida y vuelta de un punto con nombre", () => {
    const href = buildNearbyHref({
      coordinate: { latitude: -1.59, longitude: -79.0 },
      name: "Mirador",
    });
    expect(href).toEqual({
      pathname: "/nearby",
      params: { latitude: "-1.59", longitude: "-79", name: "Mirador" },
    });
    const params = (href as { params: Record<string, string> }).params;
    expect(parseNearbySearchParams(params)).toEqual({
      coordinate: { latitude: -1.59, longitude: -79 },
      name: "Mirador",
    });
  });

  it("ignora coordenadas inválidas y limpia el nombre", () => {
    expect(parseNearbySearchParams({ latitude: "95", longitude: "-79" })).toBe(
      null,
    );
    expect(parseNearbySearchParams({ latitude: "-1.5" })).toBeNull();
    expect(
      parseNearbySearchParams({
        latitude: "-1.5",
        longitude: "-79",
        name: "  Plaza\u0000  central ",
      })?.name,
    ).toBe("Plaza central");
    expect(
      parseNearbySearchParams({ latitude: "-1.5", longitude: "-79" })?.name,
    ).toBe("el destino");
  });
});
