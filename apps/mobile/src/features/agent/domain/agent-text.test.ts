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
      "• **CAFETERIA ART LATE** – Cafetería, a 932 metros.",
      "",
      "• **PLAZA LUNA** – Alojamiento, a 984 metros.",
      "",
      "Pregunta por cualquiera de ellos.",
    ].join("\n");
    expect(
      getAgentVisibleText(text, [
        { name: "CAFETERIA  ART LATE" },
        { name: "PLAZA LUNA" },
      ]),
    ).toBe(
      "Encontré 2 lugares cerca de ti:\n\nPregunta por cualquiera de ellos.",
    );
  });

  it("preserves explanations and places without a matching card", () => {
    const text =
      "• **PLAZA LUNA** – Alojamiento.\n• OTRO LUGAR – Sin ficha.\nPLAZA LUNA tiene horario sin confirmar.";
    expect(getAgentVisibleText(text, [{ name: "PLAZA LUNA" }])).toBe(
      "• OTRO LUGAR – Sin ficha.\nPLAZA LUNA tiene horario sin confirmar.",
    );
    expect(
      getAgentVisibleText("• PLAZA LUNA – Alojamiento.", [
        { name: "PLAZA LUNA" },
      ]),
    ).toBe("Aquí tienes algunas opciones.");
  });
});
