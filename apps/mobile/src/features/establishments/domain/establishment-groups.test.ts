import { describe, expect, it } from "vitest";

import { establishmentMapGroups } from "./establishment-groups";

describe("establishmentMapGroups", () => {
  it("offers Salud and Seguridad under «Ver más» with their own icons", () => {
    const health = establishmentMapGroups.find((g) => g.key === "health");
    const safety = establishmentMapGroups.find((g) => g.key === "safety");

    expect(health).toMatchObject({ icon: "hospital", primary: false });
    expect(safety).toMatchObject({ icon: "shield", primary: false });
    expect(health?.label).toBeTruthy();
    expect(safety?.label).toBeTruthy();
  });

  it("keeps unique keys", () => {
    const keys = establishmentMapGroups.map((g) => g.key);
    expect(new Set(keys).size).toBe(keys.length);
  });
});
