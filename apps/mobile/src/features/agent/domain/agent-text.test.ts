import { describe, expect, it } from "vitest";

import {
  getAgentVisibleText,
  parseAgentText,
  plainAgentText,
} from "./agent-text";

describe("agent text", () => {
  it("formats named places without exposing Markdown markers", () => {
    const text = "🎉 **EVENTOS GIRASOL** – a 1059 metros.\n\n**OTRO LUGAR**";
    expect(parseAgentText(text)).toEqual([
      { value: "🎉 ", strong: false },
      { value: "EVENTOS GIRASOL", strong: true },
      { value: " – a 1059 metros.\n\n", strong: false },
      { value: "OTRO LUGAR", strong: true },
    ]);
    expect(plainAgentText(text)).toBe(
      "🎉 EVENTOS GIRASOL – a 1059 metros.\n\nOTRO LUGAR",
    );
  });

  it("preserves incomplete markup as literal text", () => {
    expect(plainAgentText("Precio **pendiente")).toBe("Precio **pendiente");
    expect(plainAgentText("**vacío****")).toBe("vacío**");
  });

  it("keeps the answer but omits place bullets already represented by cards", () => {
    const text = [
      "Encontré 2 lugares cerca de ti:",
      "",
      "• **CAFETERIA ART LATE** – Cafetería.",
      "",
      "• **PLAZA LUNA** – Alojamiento.",
      "",
      "Pregunta por cualquiera de ellos.",
    ].join("\n");
    expect(
      getAgentVisibleText(text, [
        { name: "CAFETERIA  ART LATE", category: "Cafetería" },
        { name: "PLAZA LUNA", category: "Alojamiento" },
      ]),
    ).toBe(
      "Encontré 2 lugares cerca de ti:\n\nPregunta por cualquiera de ellos.",
    );
  });

  it("preserves explanations and places without a matching card", () => {
    const text =
      "• **PLAZA LUNA** – Alojamiento.\n• OTRO LUGAR – Sin ficha.\nPLAZA LUNA tiene horario sin confirmar.";
    expect(
      getAgentVisibleText(text, [
        { name: "PLAZA LUNA", category: "Alojamiento" },
      ]),
    ).toBe(
      "• OTRO LUGAR – Sin ficha.\nPLAZA LUNA tiene horario sin confirmar.",
    );
    expect(
      getAgentVisibleText("• PLAZA LUNA – Alojamiento.", [
        { name: "PLAZA LUNA", category: "Alojamiento" },
      ]),
    ).toBe("Aquí tienes algunas opciones.");
  });

  it("preserves entrance prices and other facts absent from compact cards", () => {
    const text = [
      "- **PLAZA LUNA**: entrada $2.",
      "• PLAZA LUNA – abre de 9:00 a 17:00.",
      "1. PLAZA LUNA – Alojamiento, a 984 metros.",
    ].join("\n");
    expect(
      getAgentVisibleText(text, [
        { name: "PLAZA LUNA", category: "Alojamiento" },
      ]),
    ).toBe(text);
  });

  it("preserves unknown categories and names that only share a prefix", () => {
    const text = "• PLAZA LUNA – Alojamiento.\n• PLAZA LUNAR: Cafetería.";
    expect(getAgentVisibleText(text, [{ name: "PLAZA LUNA" }])).toBe(text);
    expect(
      getAgentVisibleText(text, [
        { name: "PLAZA LUNA", category: "Restaurante" },
      ]),
    ).toBe(text);
  });
});
