import { describe, expect, it } from "vitest";

import {
  calculateValuation,
  calculateXlsmValuation,
  hierarchyForScore,
} from "../src/admin/valuation";

describe("valuation engine", () => {
  it("reproduces the nine XLSM criteria from the workbook signals", () => {
    const result = calculateXlsmValuation({
      accessibility: {
        transport: {
          terrestrial: {
            enabled: false,
            routes: [
              { selected: true, condition: "BUENO" },
              { selected: false, condition: "REGULAR" },
              { selected: false, condition: "MALO" },
            ],
          },
          aquatic: {
            enabled: false,
            routes: [
              {
                selected: false,
                departure: "BUENO",
                arrival: "BUENO",
              },
              {
                selected: false,
                departure: null,
                arrival: null,
              },
              {
                selected: false,
                departure: null,
                arrival: null,
              },
            ],
          },
          aerial: { enabled: false },
        },
        physicalAccess: [false, false, false, false, false],
        connectivity: [false, false, false],
      },
      plant: [
        false,
        true,
        false,
        true,
        false,
        true,
        false,
        true,
        true,
        true,
        false,
        false,
        false,
        false,
        false,
      ],
      conservation: { attraction: "ALTERADO", environment: "ALTERADO" },
      hygieneSafety: [
        true,
        true,
        false,
        false,
        false,
        false,
        false,
        false,
        true,
        false,
        true,
        true,
        true,
      ],
      policies: [false, false, false, true],
      activities: [false, false, false, true],
      promotion: [false, true, true],
      visitors: [true, true, false],
      humanResources: [false, true, true],
    });

    expect(result.criteria.map((criterion) => criterion.score)).toEqual([
      0, 7.2, 10, 7.5, 2, 9, 5, 5, 3,
    ]);
    expect(result.total).toBe(48.7);
    expect(result.hierarchyCode).toBe("02");
  });

  it("normalizes transport modes as Calculos!I18 does", () => {
    const result = calculateXlsmValuation({
      accessibility: {
        transport: {
          terrestrial: {
            enabled: true,
            routes: [{ selected: true, condition: "BUENO" }],
          },
          aquatic: {
            enabled: true,
            routes: [
              {
                selected: true,
                departure: "REGULAR",
                arrival: "REGULAR",
              },
            ],
          },
          aerial: { enabled: true },
        },
        physicalAccess: [],
        connectivity: [],
      },
      plant: [],
      conservation: { attraction: null, environment: null },
      hygieneSafety: [],
      policies: [],
      activities: [],
      promotion: [],
      visitors: [],
      humanResources: [],
    });

    expect(result.criteria[0]?.indicators[0]?.score).toBe(8);
  });

  it("reproduces the cached XLSM reference total and hierarchy", () => {
    const result = calculateValuation([
      { code: "A", indicators: [{ code: "A01", value: 0, maximum: 9 }] },
      { code: "B", indicators: [{ code: "B01", value: 7.2, maximum: 18 }] },
      { code: "C", indicators: [{ code: "C01", value: 10, maximum: 14 }] },
      { code: "D", indicators: [{ code: "D01", value: 7.5, maximum: 14 }] },
      { code: "E", indicators: [{ code: "E01", value: 2, maximum: 10 }] },
      { code: "F", indicators: [{ code: "F01", value: 9, maximum: 18 }] },
      { code: "G", indicators: [{ code: "G01", value: 5, maximum: 7 }] },
      { code: "H", indicators: [{ code: "H01", value: 5, maximum: 7 }] },
      { code: "I", indicators: [{ code: "I01", value: 3, maximum: 5 }] },
    ]);

    expect(result.total).toBe(48.7);
    expect(result.hierarchyCode).toBe("02");
  });

  it("caps indicator groups whose spreadsheet formulas can overflow", () => {
    const result = calculateValuation([
      {
        code: "F",
        indicators: [
          { code: "F01", value: 12, maximum: 18 },
          { code: "F02", value: 10, maximum: 18 },
        ],
      },
      {
        code: "H",
        indicators: [
          { code: "H01", value: 4, maximum: 7 },
          { code: "H02", value: 6, maximum: 7 },
        ],
      },
    ]);

    expect(
      result.criteria.find((criterion) => criterion.code === "F")?.score,
    ).toBe(9);
    expect(
      result.criteria.find((criterion) => criterion.code === "H")?.score,
    ).toBe(5);
    expect(result.total).toBe(14);
    expect(result.hierarchyCode).toBe("01");
  });

  it("uses the inclusive hierarchy boundaries documented by the database", () => {
    expect(hierarchyForScore(0)).toBe("00");
    expect(hierarchyForScore(10)).toBe("00");
    expect(hierarchyForScore(10.01)).toBe("01");
    expect(hierarchyForScore(35)).toBe("01");
    expect(hierarchyForScore(35.01)).toBe("02");
    expect(hierarchyForScore(60)).toBe("02");
    expect(hierarchyForScore(60.01)).toBe("03");
    expect(hierarchyForScore(85)).toBe("03");
    expect(hierarchyForScore(85.01)).toBe("04");
    expect(hierarchyForScore(100)).toBe("04");
  });
});
