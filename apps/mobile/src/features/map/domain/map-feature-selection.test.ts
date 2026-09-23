import { describe, expect, it } from "vitest";

import type { PublicCenter } from "@/features/centers/domain/public-center";
import type { PublicMapEstablishment } from "@/features/establishments/domain/establishment";
import {
  getNearbyMapFeatureSelections,
  type MapFeatureSelection,
} from "./map-feature-selection";

const center: PublicCenter = {
  code: "EC-CENTER-1",
  name: "Centro Cultural",
  description: null,
  latitude: -1.59263,
  longitude: -79.00098,
  category: "Manifestaciones culturales",
  type: "Arquitectura",
  subtype: "Centro cultural",
  hierarchy: null,
  categoryCode: "CULTURAL",
  typeCode: "ARCHITECTURE",
  subtypeCode: "CULTURAL_CENTER",
  provinceCode: "02",
  cantonCode: "0201",
  parishCode: "020101",
  hierarchyCode: null,
};

function establishment(name: string, latitude: number): PublicMapEstablishment {
  return {
    name,
    category: "Hotel",
    latitude,
    longitude: -79.00098,
    approximate: false,
    icon: "hotel",
  };
}

describe("getNearbyMapFeatureSelections", () => {
  it("incluye todos los pines dentro del radio real y excluye los lejanos", () => {
    const anchorEstablishment = establishment(
      "Hotel en el punto tocado",
      -1.59263,
    );
    const nearbyEstablishment = establishment("Hotel cercano", -1.59233);
    const farEstablishment = establishment("Hotel lejano", -1.59163);
    const anchor: MapFeatureSelection = {
      kind: "establishment",
      establishment: anchorEstablishment,
    };

    const selections = getNearbyMapFeatureSelections(
      anchor,
      [center],
      [anchorEstablishment, nearbyEstablishment, farEstablishment],
    );

    expect(selections).toHaveLength(3);
    expect(selections[0]).toBe(anchor);
    expect(
      selections.map((selection) =>
        selection.kind === "center"
          ? selection.center.name
          : selection.establishment.name,
      ),
    ).toEqual(["Hotel en el punto tocado", "Centro Cultural", "Hotel cercano"]);
  });

  it("devuelve solo el ancla cuando no existen otros pines en 50 metros", () => {
    const isolatedCenter = {
      ...center,
      latitude: -1.6,
      longitude: -79.01,
    };
    const anchor: MapFeatureSelection = {
      kind: "center",
      center: isolatedCenter,
    };

    expect(getNearbyMapFeatureSelections(anchor, [isolatedCenter], [])).toEqual(
      [anchor],
    );
  });
});
