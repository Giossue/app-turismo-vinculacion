import { describe, expect, it } from "vitest";

import {
  parseLegalDocumentType,
  parseLegalPublishedAt,
  splitLegalParagraphs,
} from "./legal-document";

describe("legal document", () => {
  it("splits a section into its paragraphs", () => {
    expect(splitLegalParagraphs("Uno.\n\nDos\ncontinúa.\n\n\n\n  Tres. ")).toEqual(
      ["Uno.", "Dos\ncontinúa.", "Tres."],
    );
    expect(splitLegalParagraphs("  ")).toEqual([]);
  });

  it("accepts only known document types in the route", () => {
    expect(parseLegalDocumentType("terms")).toBe("terms");
    expect(parseLegalDocumentType("privacy")).toBe("privacy");
    expect(parseLegalDocumentType("cookies")).toBeNull();
    expect(parseLegalDocumentType(undefined)).toBeNull();
  });

  it("keeps a date without time on its calendar day", () => {
    expect(parseLegalPublishedAt("2026-11-01")).toEqual(new Date(2026, 10, 1));
  });

  it("reads timestamps and refuses invalid values", () => {
    expect(parseLegalPublishedAt("2026-11-01T12:00:00.000Z")).toEqual(
      new Date("2026-11-01T12:00:00.000Z"),
    );
    expect(parseLegalPublishedAt("mañana")).toBeNull();
  });
});
