import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  listSavedCenters,
  removeSavedCenter,
  saveCenter,
} from "./saved-centers-storage";

const values = new Map<string, string>();

vi.mock("@react-native-async-storage/async-storage", () => ({
  default: {
    getItem: vi.fn(async (key: string) => values.get(key) ?? null),
    setItem: vi.fn(async (key: string, value: string) => {
      values.set(key, value);
    }),
  },
}));

const firstCenter = {
  code: "020201AN010103001",
  name: "Mirador turístico de Guaranda",
  description: null,
  latitude: -1.59263,
  longitude: -79.00098,
  category: "Atractivos naturales",
  type: "Sitios naturales",
  subtype: "Miradores",
  hierarchy: "III",
  categoryCode: "AN",
  typeCode: "01",
  subtypeCode: "01",
  provinceCode: "02",
  cantonCode: "02",
  parishCode: "01",
  hierarchyCode: "03",
} as const;

const secondCenter = {
  ...firstCenter,
  code: "020201MC010101001",
  name: "Centro",
};

describe("saved centers storage", () => {
  beforeEach(() => {
    values.clear();
  });

  it("puts recently saved centers first and replaces duplicates", async () => {
    await saveCenter(firstCenter);
    await saveCenter(secondCenter);
    await saveCenter({ ...firstCenter, name: "Mirador actualizado" });

    await expect(listSavedCenters()).resolves.toEqual([
      { ...firstCenter, name: "Mirador actualizado" },
      secondCenter,
    ]);
  });

  it("removes only the selected center", async () => {
    await saveCenter(firstCenter);
    await saveCenter(secondCenter);
    await removeSavedCenter(firstCenter.code);

    await expect(listSavedCenters()).resolves.toEqual([secondCenter]);
  });

  it("ignores malformed persisted entries", async () => {
    values.set(
      "turismo-vinculacion-saved-centers-v1",
      JSON.stringify([{ code: "incompleto" }, firstCenter]),
    );

    await expect(listSavedCenters()).resolves.toEqual([firstCenter]);
  });
});
