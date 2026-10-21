import { describe, expect, it } from "vitest";

import { resolveSharedLinkPath } from "./shared-link-path";

const origin = "https://api.maps.devs-ueb.tech";

describe("resolveSharedLinkPath", () => {
  it("abre la ficha de un centro", () => {
    expect(resolveSharedLinkPath(`${origin}/c/GUA-001`)).toBe(
      "/centers/GUA-001",
    );
  });

  it("abre la ficha de un establecimiento", () => {
    expect(resolveSharedLinkPath(`${origin}/e/42`)).toBe("/establishments/42");
  });

  it("abre la vista previa de una ruta compartida", () => {
    expect(
      resolveSharedLinkPath(
        `${origin}/r?lat=-1.59&lng=-79.0&name=Plaza%20Roja&mode=foot`,
      ),
    ).toBe(
      "/route?destinationLatitude=-1.59&destinationLongitude=-79&mode=foot&destinationName=Plaza+Roja",
    );
  });

  it("usa auto cuando el modo no es válido", () => {
    expect(resolveSharedLinkPath(`${origin}/r?lat=1&lng=2&mode=plane`)).toBe(
      "/route?destinationLatitude=1&destinationLongitude=2&mode=car",
    );
  });

  it("lleva al inicio cuando el enlace compartido es inválido", () => {
    expect(resolveSharedLinkPath(`${origin}/c/<script>`)).toBe("/");
    expect(resolveSharedLinkPath(`${origin}/e/abc`)).toBe("/");
    expect(resolveSharedLinkPath(`${origin}/r?lat=200&lng=2`)).toBe("/");
    expect(resolveSharedLinkPath(`${origin}/r?lng=2`)).toBe("/");
  });

  it("deja intactas las demás rutas y el scheme de la app", () => {
    expect(resolveSharedLinkPath("rumbo-ec://centers/GUA-001")).toBeNull();
    expect(resolveSharedLinkPath(`${origin}/descargar`)).toBeNull();
    expect(resolveSharedLinkPath("/settings")).toBeNull();
  });
});
