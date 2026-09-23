import { describe, expect, it } from "vitest";

import { toggleMapFilter } from "./explore-map-filter";

describe("toggleMapFilter", () => {
  it("selects a chip when nothing is selected", () => {
    expect(toggleMapFilter(null, { kind: "tourism" })).toEqual({
      kind: "tourism",
    });
  });

  it("clears the filter when the selected chip is tapped again", () => {
    expect(
      toggleMapFilter({ kind: "tourism" }, { kind: "tourism" }),
    ).toBeNull();
    expect(
      toggleMapFilter(
        { kind: "establishments", group: "cafes" },
        { kind: "establishments", group: "cafes" },
      ),
    ).toBeNull();
  });

  it("switches directly to another chip", () => {
    expect(
      toggleMapFilter(
        { kind: "establishments", group: "cafes" },
        { kind: "establishments", group: "bars" },
      ),
    ).toEqual({ kind: "establishments", group: "bars" });
    expect(
      toggleMapFilter(
        { kind: "tourism" },
        { kind: "establishments", group: "lodging" },
      ),
    ).toEqual({ kind: "establishments", group: "lodging" });
  });
});
