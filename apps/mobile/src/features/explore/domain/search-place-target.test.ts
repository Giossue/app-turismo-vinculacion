import { describe, expect, it } from "vitest";

import type { PublicCenter } from "@/features/centers/domain/public-center";
import type { PublicSearchResult } from "@/features/search/domain/search-result";
import { getSearchPlaceTarget } from "./search-place-target";

const loadedCenter: PublicCenter = {
  code: "C-1",
  name: "Cruz Loma",
  description: "Mirador",
  latitude: -1.59,
  longitude: -79,
  category: "Atractivos naturales",
  type: "Montaña",
  subtype: "Colina",
  hierarchy: "II",
  categoryCode: "NAT",
  typeCode: "MON",
  subtypeCode: "COL",
  provinceCode: "02",
  cantonCode: "0201",
  parishCode: "020101",
  hierarchyCode: "H2",
};

const fallbackPin = { key: "shop-supermarket", color: "#123456" };

const base: PublicSearchResult = {
  kind: "geographic",
  source: "photon",
  title: "Guaranda",
  subtitle: "Bolívar",
  latitude: -1.6,
  longitude: -79.01,
};

describe("getSearchPlaceTarget", () => {
  it("focuses the loaded copy of a center", () => {
    const target = getSearchPlaceTarget(
      { ...base, kind: "center", centerCode: "C-1", title: "Otro nombre" },
      [loadedCenter],
      fallbackPin,
    );
    expect(target).toEqual({
      kind: "feature",
      selection: { kind: "center", center: loadedCenter },
    });
  });

  it("rebuilds a center outside the map when the result is complete", () => {
    const target = getSearchPlaceTarget(
      {
        ...base,
        kind: "center",
        centerCode: "C-9",
        title: "Salinas",
        category: "Manifestaciones culturales",
        type: "Arquitectura",
        subtype: "Pueblo",
        categoryCode: "CUL",
        typeCode: "ARQ",
        subtypeCode: "PUE",
        provinceCode: "02",
        cantonCode: "0201",
        parishCode: "020155",
      },
      [loadedCenter],
      fallbackPin,
    );
    expect(target?.kind).toBe("feature");
    if (target?.kind !== "feature" || target.selection.kind !== "center") {
      throw new Error("expected a center feature");
    }
    expect(target.selection.center).toMatchObject({
      code: "C-9",
      name: "Salinas",
      hierarchy: null,
      latitude: -1.6,
    });
  });

  it("ignores an unknown center without its classification", () => {
    expect(
      getSearchPlaceTarget(
        { ...base, kind: "center", centerCode: "C-9" },
        [loadedCenter],
        fallbackPin,
      ),
    ).toBeNull();
  });

  it("builds an establishment pin with default styling", () => {
    const target = getSearchPlaceTarget(
      { ...base, kind: "establishment", title: "Hostal", category: "Hotel" },
      [],
      fallbackPin,
    );
    expect(target).toEqual({
      kind: "feature",
      selection: {
        kind: "establishment",
        establishment: {
          name: "Hostal",
          category: "Hotel",
          categoryLabel: "Bolívar",
          latitude: -1.6,
          longitude: -79.01,
          approximate: false,
          icon: "shop-supermarket",
          color: "#123456",
        },
      },
    });
  });

  it("moves the camera to geographic places and centers without code", () => {
    const expected = {
      kind: "coordinate",
      coordinate: { latitude: -1.6, longitude: -79.01 },
      title: "Guaranda",
    };
    expect(getSearchPlaceTarget(base, [], fallbackPin)).toEqual(expected);
    expect(getSearchPlaceTarget({ ...base, kind: "center" }, [], fallbackPin)).toEqual(
      expected,
    );
  });
});
