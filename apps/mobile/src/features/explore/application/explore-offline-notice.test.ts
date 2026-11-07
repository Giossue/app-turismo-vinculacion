import { describe, expect, it } from "vitest";

import type { GeoBoundingBox } from "@/core/geo/types";
import type { OfflineCitySummary } from "@/features/offline/domain/offline-city";
import {
  getExploreOfflineNotice,
  getOfflineContentBounds,
} from "./explore-offline-query-state";

const guayaquil: GeoBoundingBox = [-80, -2.3, -79.8, -2.1];
const guaranda: GeoBoundingBox = [-79.05, -1.65, -78.95, -1.55];

const summary = {
  city: { slug: "gye", name: "Guayaquil" },
  bounds: guayaquil,
} as unknown as OfflineCitySummary;

describe("aviso de Explorar sin conexión", () => {
  it("no muestra nada con conexión", () => {
    expect(getExploreOfflineNotice(false, [summary], guaranda)).toBeNull();
  });

  it("avisa aunque no haya ninguna descarga", () => {
    expect(getExploreOfflineNotice(true, [], guaranda)).toEqual({
      kind: "no-downloads",
    });
  });

  it("confirma la descarga cuando el mapa está sobre ella", () => {
    expect(getExploreOfflineNotice(true, [summary], guayaquil)).toEqual({
      kind: "downloaded",
    });
  });

  it("ofrece ir a la ciudad descargada cuando el mapa está en otra zona", () => {
    expect(getExploreOfflineNotice(true, [summary], guaranda)).toEqual({
      kind: "elsewhere",
      bounds: guayaquil,
      cityName: "Guayaquil",
    });
  });
});

describe("contenido descargado para el mapa", () => {
  it("abre todas las descargas sin conexión, sin importar la cámara", () => {
    expect(getOfflineContentBounds(true, false, guaranda)).toBeNull();
  });

  it("mantiene el área al buscar", () => {
    expect(getOfflineContentBounds(true, true, guaranda)).toBe(guaranda);
  });

  it("mantiene el área con conexión", () => {
    expect(getOfflineContentBounds(false, false, guaranda)).toBe(guaranda);
  });
});
