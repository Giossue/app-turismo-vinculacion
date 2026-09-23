import { describe, expect, it } from "vitest";

import type { PublicCenter } from "@/features/centers/domain/public-center";
import type { PublicMapEstablishment } from "@/features/establishments/domain/establishment";
import {
  getExploreBackAction,
  getSelectedCenterCode,
  getSelectedEstablishmentKey,
  noExploreOverlay,
  type ExploreOverlay,
} from "./explore-overlay";

const center: PublicCenter = {
  code: "C-1",
  name: "Cruz Loma",
  description: null,
  latitude: -1.59,
  longitude: -79,
  category: "Atractivos naturales",
  type: "Montaña",
  subtype: "Colina",
  hierarchy: null,
  categoryCode: "NAT",
  typeCode: "MON",
  subtypeCode: "COL",
  provinceCode: "02",
  cantonCode: "0201",
  parishCode: "020101",
  hierarchyCode: null,
};

const establishment: PublicMapEstablishment = {
  name: "Hostal",
  category: "Hotel",
  latitude: -1.6,
  longitude: -79.01,
  approximate: false,
  icon: "hotel",
  color: "#7c3aed",
};

describe("selected map features", () => {
  it("paints the open sheet and the feature being focused", () => {
    const focusing: ExploreOverlay = {
      kind: "focusing",
      selection: { kind: "center", center },
    };
    expect(getSelectedCenterCode({ kind: "center", center })).toBe("C-1");
    expect(getSelectedCenterCode(focusing)).toBe("C-1");
    expect(getSelectedEstablishmentKey(focusing)).toBeNull();
    expect(
      getSelectedEstablishmentKey({ kind: "establishment", establishment }),
    ).toBe("Hostal:-1.6:-79.01");
  });

  it("paints nothing for choices, the agent or no overlay", () => {
    const overlays: ExploreOverlay[] = [
      noExploreOverlay,
      { kind: "agent" },
      { kind: "choices", selections: [{ kind: "center", center }] },
    ];
    for (const overlay of overlays) {
      expect(getSelectedCenterCode(overlay)).toBeNull();
      expect(getSelectedEstablishmentKey(overlay)).toBeNull();
    }
  });
});

describe("getExploreBackAction", () => {
  const idle = {
    menuVisible: false,
    overlay: noExploreOverlay,
    searchActive: false,
    searchFocused: false,
  };

  it("closes the focused search, the menu, the overlay, then the search", () => {
    expect(
      getExploreBackAction({
        menuVisible: true,
        overlay: { kind: "agent" },
        searchActive: true,
        searchFocused: true,
      }),
    ).toBe("closeSearchFocus");
    expect(
      getExploreBackAction({
        ...idle,
        menuVisible: true,
        overlay: { kind: "center", center },
      }),
    ).toBe("closeMenu");
    expect(
      getExploreBackAction({
        ...idle,
        overlay: { kind: "center", center },
        searchActive: true,
      }),
    ).toBe("closeOverlay");
    expect(getExploreBackAction({ ...idle, searchActive: true })).toBe(
      "clearSearch",
    );
  });

  it("lets navigation handle Back when nothing is open", () => {
    expect(getExploreBackAction(idle)).toBeNull();
  });
});
