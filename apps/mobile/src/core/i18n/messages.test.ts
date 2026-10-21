import { afterEach, describe, expect, it } from "vitest";

import { formatRelativeDate } from "@/core/format/date";
import { assertResponseOk } from "@/core/api/http";
import { getStepInstruction } from "@/features/routing/domain/route-instruction-text";
import type { CalculatedRoute } from "@/features/routing/domain/routing";
import {
  getAppLocale,
  getLanguage,
  getSpeechLanguage,
  liveMessages,
  messages,
  messagesFor,
  resolveDeviceLanguage,
  setLanguage,
} from "./language";

type Shape = string | number | Readonly<{ [key: string]: Shape }>;

/** Claves de hojas y aridad de funciones: dos idiomas deben coincidir. */
function describeShape(value: unknown, path = ""): Record<string, Shape> {
  if (typeof value === "function") return { [path]: value.length };
  if (typeof value === "string") return { [path]: "string" };
  const entries = Object.entries(value as Record<string, unknown>);
  return Object.assign(
    {},
    ...entries.map(([key, child]) =>
      describeShape(child, path ? `${path}.${key}` : key),
    ),
  );
}

function collectStrings(value: unknown): string[] {
  if (typeof value === "string") return [value];
  if (typeof value !== "object" || value === null) return [];
  return Object.values(value).flatMap(collectStrings);
}

afterEach(() => setLanguage("es"));

describe("diccionarios", () => {
  it("el inglés tiene las mismas claves y funciones que el español", () => {
    expect(describeShape(messagesFor("en"))).toEqual(
      describeShape(messagesFor("es")),
    );
  });

  it("no deja textos vacíos", () => {
    for (const language of ["es", "en"] as const) {
      for (const text of collectStrings(messagesFor(language))) {
        expect(text.trim()).not.toBe("");
      }
    }
  });
});

describe("idioma activo", () => {
  it("empieza en español y cambia locale, voz y textos", () => {
    expect(getLanguage()).toBe("es");
    expect(getAppLocale()).toBe("es-EC");
    setLanguage("en");
    expect(messages().routing.session.arrived).toBe(
      "You have arrived at your destination.",
    );
    expect(getAppLocale()).toBe("en-US");
    expect(getSpeechLanguage()).toBe("en-US");
  });

  it("las vistas vivas siguen el idioma activo", () => {
    const live = liveMessages((all) => all.routing.session);
    expect(live.arrived).toBe("Has llegado a tu destino.");
    setLanguage("en");
    expect(live.arrived).toBe("You have arrived at your destination.");
  });

  it("resuelve el primer idioma admitido del dispositivo", () => {
    expect(resolveDeviceLanguage(["en-GB"])).toBe("en");
    expect(resolveDeviceLanguage(["de-DE", "es_EC"])).toBe("es");
    expect(resolveDeviceLanguage(["fr", null])).toBe("es");
    expect(resolveDeviceLanguage([])).toBe("es");
  });

  it("formatea fechas relativas en el idioma activo", () => {
    const now = Date.parse("2026-09-22T12:00:00.000Z");
    setLanguage("en");
    expect(formatRelativeDate("2026-09-21T11:00:00.000Z", now)).toBe(
      "1 day ago",
    );
  });
});

describe("indicaciones de ruta", () => {
  const route: CalculatedRoute = {
    mode: "car",
    distanceMeters: 1_000,
    durationSeconds: 120,
    geometry: { type: "LineString", coordinates: [] },
    steps: [
      {
        instruction: "Sal por Calle Sucre",
        distanceMeters: 100,
        durationSeconds: 10,
        name: "Calle Sucre",
        maneuver: { type: "depart", modifier: null, exit: null },
      },
      {
        instruction: "Llegaste a la parada 1",
        distanceMeters: 0,
        durationSeconds: 0,
        name: null,
        maneuver: { type: "arrive", modifier: null, exit: null },
      },
      {
        instruction: "Gira a la izquierda por Av. Cándido Rada",
        distanceMeters: 300,
        durationSeconds: 30,
        name: "Av. Cándido Rada",
        maneuver: { type: "turn", modifier: "left", exit: null },
      },
      {
        instruction: "Has llegado a tu destino",
        distanceMeters: 0,
        durationSeconds: 0,
        name: null,
        maneuver: { type: "arrive", modifier: null, exit: null },
      },
    ],
  };

  it("conserva el texto de la API en español", () => {
    expect(getStepInstruction(route, 2)).toBe(
      "Gira a la izquierda por Av. Cándido Rada",
    );
  });

  it("redacta la maniobra en inglés y numera las paradas", () => {
    setLanguage("en");
    expect(getStepInstruction(route, 0)).toBe("Head out on Calle Sucre");
    expect(getStepInstruction(route, 1)).toBe("You have reached stop 1");
    expect(getStepInstruction(route, 2)).toBe(
      "Turn left onto Av. Cándido Rada",
    );
    expect(getStepInstruction(route, 3)).toBe(
      "You have arrived at your destination",
    );
  });
});

describe("mensajes del servidor", () => {
  const failed = () =>
    new Response(
      JSON.stringify({ error: { message: "Correo o contraseña inválidos." } }),
      { status: 401 },
    );

  it("muestra el mensaje de la API en español", async () => {
    await expect(
      assertResponseOk(failed(), {
        errorMessage: "No se pudo iniciar sesión.",
        useServerMessage: true,
      }),
    ).rejects.toThrow("Correo o contraseña inválidos.");
  });

  it("usa el texto por estado en inglés", async () => {
    setLanguage("en");
    await expect(
      assertResponseOk(failed(), {
        errorMessage: "We couldn't sign you in.",
        serverMessageFallbacks: { 401: "Incorrect email or password." },
        useServerMessage: true,
      }),
    ).rejects.toThrow("Incorrect email or password.");
  });
});
