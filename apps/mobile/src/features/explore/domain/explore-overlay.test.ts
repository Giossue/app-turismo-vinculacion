import { describe, expect, it } from "vitest";

import type { PublicCenter } from "@/features/centers/domain/public-center";
import { getExploreBackAction, noExploreOverlay } from "./explore-overlay";

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
