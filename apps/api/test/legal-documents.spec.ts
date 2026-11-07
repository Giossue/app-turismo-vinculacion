import { describe, expect, it } from "vitest";

import { LegalController } from "../src/legal/legal.controller";
import {
  CURRENT_LEGAL_DOCUMENTS,
  hasCurrentLegalVersion,
  pendingLegalDocuments,
} from "../src/legal/legal-documents";
import { LEGAL_CONTACT_EMAIL } from "../src/legal/legal-responsible";

function documentText(type: "terms" | "privacy"): string {
  const document = CURRENT_LEGAL_DOCUMENTS.find((item) => item.type === type);
  if (!document) throw new Error(`Missing legal document ${type}.`);
  return document.sections
    .map((section) => `${section.heading}\n\n${section.body}`)
    .join("\n\n");
}

describe("legal documents", () => {
  it("publishes one current version per document with the agreed shape", () => {
    const { data } = new LegalController().documents();

    expect(data.map((document) => document.type)).toEqual(["terms", "privacy"]);
    for (const document of data) {
      expect(document.version).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(document.publishedAt).toMatch(/^\d{4}-\d{2}-\d{2}/);
      expect(document.title.length).toBeGreaterThan(0);
      expect(document.sections.length).toBeGreaterThan(0);
      for (const section of document.sections) {
        expect(section.heading.trim()).not.toBe("");
        expect(section.body.trim()).not.toBe("");
        expect(section.body).not.toMatch(/<[a-z]|\*\*|^#/m);
      }
    }
  });

  it("keeps the pending institutional email in a single constant", () => {
    expect(LEGAL_CONTACT_EMAIL).toBe("[correo institucional pendiente]");
    expect(documentText("privacy")).toContain(LEGAL_CONTACT_EMAIL);
    expect(documentText("terms")).toContain(LEGAL_CONTACT_EMAIL);
  });

  it("identifies the responsible party in both documents", () => {
    for (const type of ["terms", "privacy"] as const) {
      const text = documentText(type);
      expect(text).toContain("Universidad Estatal de Bolívar");
      expect(text).toContain("Av. Ernesto Che Guevara y Gabriel Secaira");
      expect(text).toContain("Guaranda");
      expect(text).toContain("(593) 3220 6010");
      expect(text).toContain("Wasi Travel");
    }
  });

  it("informs each point of article 12 of the LOPDP", () => {
    const text = documentText("privacy");
    // One expectation per point of the article, in its order.
    const points: Array<[string, RegExp]> = [
      ["purposes", /finalidades/i],
      ["legal basis", /base legal/i],
      ["types of treatment", /tipos de tratamiento/i],
      ["retention", /tiempo de conservación/i],
      ["database", /base de datos/i],
      ["origin", /origen de los datos/i],
      ["other purposes", /otras finalidades/i],
      ["responsible", /responsable del tratamiento/i],
      ["data protection officer", /delegado de protección de datos/i],
      ["transfers", /transferencias nacionales e internacionales/i],
      ["consequences", /consecuencias de entregar o negar/i],
      ["inaccurate data", /datos inexactos/i],
      ["revocation", /revocar tu consentimiento/i],
      [
        "rights",
        /acceso, eliminación, rectificación y actualización, oposición, anulación, limitación/i,
      ],
      ["portability", /portabilidad/i],
      ["complaints", /Superintendencia de Protección de Datos Personales/],
      [
        "automated decisions",
        /decisiones automatizadas y elaboración de perfiles/i,
      ],
    ];
    for (const [point, pattern] of points) {
      expect(text, point).toMatch(pattern);
    }
  });

  it("states the observed treatment facts", () => {
    const text = documentText("privacy");
    for (const fact of [
      "Anthropic",
      "OpenAI",
      "3 decimales",
      "30 días",
      "15 años",
      "Sentry",
      "segundo plano",
      "SPDP-SPD-2026-0009-R",
      "Quinto Suplemento 459",
      "Decreto Ejecutivo 904",
      "Perfil",
    ]) {
      expect(text, fact).toContain(fact);
    }
    expect(text).toMatch(/puede equivocarse/i);
    expect(text).toMatch(/informativ/i);
    expect(text).toMatch(/conserv\w+ .*constancias|constancias .*conserv/i);
  });

  it("makes the terms state the assistant limits and the minimum age", () => {
    const text = documentText("terms");
    expect(text).toMatch(/puede equivocarse/i);
    expect(text).toMatch(/15 años/);
    expect(text).toContain("Ley Orgánica de Defensa del Consumidor");
    expect(text).toContain("Ley de Comercio Electrónico");
    expect(text).not.toMatch(/art(í|i)culo \d|art\. \d/i);
  });
});

describe("legal version rules", () => {
  const current = Object.fromEntries(
    CURRENT_LEGAL_DOCUMENTS.map((item) => [item.type, item.version]),
  ) as { terms: string; privacy: string };

  it("recognizes only the current version of a document", () => {
    expect(hasCurrentLegalVersion("terms", current.terms)).toBe(true);
    expect(hasCurrentLegalVersion("terms", "2020-01-01")).toBe(false);
  });

  it("reports what has no record at the current version", () => {
    expect(pendingLegalDocuments([])).toEqual(["terms", "privacy"]);
    expect(
      pendingLegalDocuments([
        { documento: "terms", version: current.terms },
        { documento: "privacy", version: "2020-01-01" },
      ]),
    ).toEqual(["privacy"]);
    expect(
      pendingLegalDocuments([
        { documento: "terms", version: current.terms },
        { documento: "privacy", version: current.privacy },
      ]),
    ).toEqual([]);
  });
});
