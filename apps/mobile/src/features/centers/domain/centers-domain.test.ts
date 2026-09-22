import { describe, expect, it } from "vitest";

import { formatAdmissionPrice, formatRating } from "./center-format";
import { uniqueByCode } from "./unique-by-code";

describe("uniqueByCode", () => {
  const options = [
    { code: "B", name: "Balneario" },
    { code: "A", name: "Mirador" },
    { code: "B", name: "Balneario actualizado" },
  ];

  it("keeps first positions and last values", () => {
    expect(uniqueByCode(options)).toEqual([
      { code: "B", name: "Balneario actualizado" },
      { code: "A", name: "Mirador" },
    ]);
  });

  it("can sort by name", () => {
    expect(
      uniqueByCode(options, { sortByName: true }).map((item) => item.code),
    ).toEqual(["B", "A"]);
    expect(
      uniqueByCode(
        [
          { code: "2", name: "Zoológico" },
          { code: "1", name: "Artesanías" },
        ],
        { sortByName: true },
      ).map((item) => item.name),
    ).toEqual(["Artesanías", "Zoológico"]);
  });
});

describe("center formatting", () => {
  it("formats ratings with a decimal comma", () => {
    expect(formatRating(4.25)).toBe("4,3");
    expect(formatRating(5)).toBe("5,0");
  });

  it("formats admission prices with two decimals", () => {
    expect(formatAdmissionPrice(5, null)).toBe("$5.00");
    expect(formatAdmissionPrice(null, 3.5)).toBe("$3.50");
    expect(formatAdmissionPrice(2.5, 5)).toBe("$2.50 – $5.00");
    expect(formatAdmissionPrice(5, 5)).toBe("$5.00");
    expect(formatAdmissionPrice(null, null)).toBe("No registrado");
  });
});
