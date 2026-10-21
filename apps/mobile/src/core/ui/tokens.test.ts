import { describe, expect, it } from "vitest";

import { getContrastRatio } from "./color-contrast";
import { describeViewerPhoto } from "./photo-viewer-label";
import { turismoColors, turismoMetrics } from "./tokens";

/** WCAG AA para texto normal; los íconos y bordes necesitan 3:1. */
const textMinimum = 4.5;
const textRoles = [
  "text",
  "textMuted",
  "textFaint",
  "primary",
  "primaryStrong",
  "accent",
  "danger",
] as const;
const surfaceRoles = [
  "background",
  "surface",
  "surfaceMuted",
  "surfaceStrong",
  "primarySoft",
] as const;

describe("contraste de la paleta", () => {
  for (const [scheme, colors] of Object.entries(turismoColors)) {
    for (const text of textRoles) {
      for (const surface of surfaceRoles) {
        it(`${scheme}: ${text} sobre ${surface} cumple AA`, () => {
          expect(
            getContrastRatio(colors[text], colors[surface]),
          ).toBeGreaterThanOrEqual(textMinimum);
        });
      }
    }

    it(`${scheme}: onPrimary sobre primary cumple AA`, () => {
      expect(
        getContrastRatio(colors.onPrimary, colors.primary),
      ).toBeGreaterThanOrEqual(textMinimum);
    });

    it(`${scheme}: warm (estrellas) cumple 3:1 sobre las superficies`, () => {
      for (const surface of surfaceRoles) {
        expect(
          getContrastRatio(colors.warm, colors[surface]),
        ).toBeGreaterThanOrEqual(3);
      }
    });
  }
});

describe("objetivos táctiles", () => {
  it("el mínimo es 48 dp", () => {
    expect(turismoMetrics.touchTarget).toBeGreaterThanOrEqual(48);
  });

  it("un chip con su hitSlop alcanza el mínimo", () => {
    expect(
      turismoMetrics.chipHeight + turismoMetrics.chipHitSlop * 2,
    ).toBeGreaterThanOrEqual(turismoMetrics.touchTarget);
  });
});

describe("describeViewerPhoto", () => {
  it("añade la posición cuando hay varias fotografías", () => {
    expect(describeViewerPhoto("Cascada", 1, 4)).toBe(
      "Cascada. Fotografía 2 de 4",
    );
  });

  it("usa una descripción genérica sin repetir la posición de una sola foto", () => {
    expect(describeViewerPhoto("  ", 0, 1)).toBe("Fotografía del lugar");
  });
});
