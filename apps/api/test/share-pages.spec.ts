import { describe, expect, it } from "vitest";

import {
  isValidCenterCode,
  parseRouteShareQuery,
  renderCenterSharePage,
  renderRouteSharePage,
} from "../src/sharing/share-pages";

describe("shared center page", () => {
  const center = {
    code: "020101AN010101001",
    name: "Mirador <b>El Cóndor</b>",
    description: "x".repeat(400),
    category: "Sitios naturales",
    type: "Montaña",
    address: null,
    latitude: -1.59,
    longitude: -79.01,
    photos: [{ url: "/api/v1/media/centers/1" }],
  };

  it("escapes the content and offers the app, directions and download", () => {
    const html = renderCenterSharePage(center);
    expect(html).not.toContain("<b>");
    expect(html).toContain("&lt;b&gt;El Cóndor&lt;/b&gt;");
    expect(html).toContain('href="rumbo-ec://centers/020101AN010101001"');
    expect(html).toContain("destination=-1.59,-79.01");
    expect(html).toContain('href="/descargar"');
    expect(html).not.toContain("x".repeat(300));
  });

  it("accepts only alphanumeric codes", () => {
    expect(isValidCenterCode("020101AN010101001")).toBe(true);
    expect(isValidCenterCode("../admin")).toBe(false);
    expect(isValidCenterCode("")).toBe(false);
  });
});

describe("shared route page", () => {
  it("validates coordinates, mode and name", () => {
    expect(parseRouteShareQuery({ lat: "-1.59", lng: "-79" })).toEqual({
      latitude: -1.59,
      longitude: -79,
      name: "Destino",
      mode: "car",
    });
    expect(parseRouteShareQuery({ lat: "91", lng: "-79" })).toBeNull();
    expect(parseRouteShareQuery({ lat: "abc", lng: "-79" })).toBeNull();
    expect(parseRouteShareQuery({ lng: "-79" })).toBeNull();
    const parsed = parseRouteShareQuery({
      lat: "-1.59",
      lng: "-79",
      mode: "rocket",
      name: ` Plaza\u0000 ${"y".repeat(300)}`,
    });
    expect(parsed?.mode).toBe("car");
    expect(Array.from(parsed?.name ?? "")).toHaveLength(120);
    expect(parsed?.name.startsWith("Plaza y")).toBe(true);
  });

  it("builds an escaped app link with the route params", () => {
    const html = renderRouteSharePage({
      latitude: -1.59,
      longitude: -79,
      name: 'Café "La Plaza" & <bar>',
      mode: "foot",
    });
    expect(html).not.toContain("<bar>");
    expect(html).toContain(
      "rumbo-ec://route?destinationLatitude=-1.59&amp;destinationLongitude=-79&amp;destinationName=Caf%C3%A9+%22La+Plaza%22+%26+%3Cbar%3E&amp;mode=foot",
    );
    expect(html).toContain("A pie");
    expect(html).toContain('href="/descargar"');
  });
});
