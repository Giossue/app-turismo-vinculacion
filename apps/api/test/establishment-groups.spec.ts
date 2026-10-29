import { describe, expect, it } from "vitest";

import {
  ESTABLISHMENT_MAP_GROUP_KEYS,
  ESTABLISHMENT_MAP_GROUPS,
} from "../src/establishments/establishment-groups";

describe("establishment map groups", () => {
  it("exposes health and safety by their catastro activity", () => {
    expect(ESTABLISHMENT_MAP_GROUPS.health).toEqual({
      activities: ["SERVICIOS DE SALUD"],
    });
    expect(ESTABLISHMENT_MAP_GROUPS.safety).toEqual({
      activities: ["SEGURIDAD Y EMERGENCIAS"],
    });
    expect(ESTABLISHMENT_MAP_GROUP_KEYS).toEqual(
      expect.arrayContaining(["health", "safety"]),
    );
  });

  it("does not map one activity to two groups", () => {
    const activities = Object.values(ESTABLISHMENT_MAP_GROUPS).flatMap(
      (group) => ("activities" in group ? group.activities : []),
    );
    expect(new Set(activities).size).toBe(activities.length);
  });
});
