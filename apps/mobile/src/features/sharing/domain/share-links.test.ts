import { describe, expect, it } from "vitest";

import { sanitizeTextParam } from "@/core/navigation/search-params";
import { parseRouteSearchParams } from "@/features/routing/presentation/route-href";
import {
  buildCenterShareUrl,
  buildEstablishmentShareUrl,
  buildRouteShareUrl,
  buildShareMessage,
  getShareOrigin,
  isValidCenterCode,
} from "./share-links";

const origin = "https://api.turismo.test";

describe("share links", () => {
  it("uses the public origin of the API, without its prefix", () => {
    expect(getShareOrigin("https://api.turismo.test/api/v1")).toBe(origin);
  });

  it("builds short links for centers and establishments", () => {
    expect(buildCenterShareUrl(origin, "020101AN010101001")).toBe(
      "https://api.turismo.test/c/020101AN010101001",
    );
    expect(buildEstablishmentShareUrl(origin, 78)).toBe(
      "https://api.turismo.test/e/78",
    );
  });

  it("encodes the route destination, name and mode", () => {
    const url = new URL(
      buildRouteShareUrl(
        origin,
        { latitude: -1.5890512345, longitude: -79.0007, name: "Plaza & Río" },
        "foot",
      ),
    );
    expect(url.pathname).toBe("/r");
    expect(Object.fromEntries(url.searchParams)).toEqual({
      lat: "-1.589051",
      lng: "-79.0007",
      mode: "foot",
      name: "Plaza & Río",
    });
  });

  it("puts the link on its own line in the message", () => {
    expect(buildShareMessage("Mirador", `${origin}/c/A1`)).toBe(
      "Mirador\nhttps://api.turismo.test/c/A1",
    );
  });

  it("accepts only alphanumeric center codes", () => {
    expect(isValidCenterCode("020101AN010101001")).toBe(true);
    expect(isValidCenterCode("")).toBe(false);
    expect(isValidCenterCode("../admin")).toBe(false);
    expect(isValidCenterCode("A".repeat(41))).toBe(false);
  });
});

describe("incoming shared names", () => {
  it("removes control characters, collapses spaces and trims", () => {
    expect(sanitizeTextParam(" Plaza\u0000\n  central ", 120)).toBe(
      "Plaza central",
    );
    expect(sanitizeTextParam(["  ", "otro"], 120)).toBeUndefined();
    expect(sanitizeTextParam(undefined, 120)).toBeUndefined();
  });

  it("limits the length without splitting characters", () => {
    expect(sanitizeTextParam("ñ".repeat(200), 120)).toBe("ñ".repeat(120));
  });

  it("is applied to the route destination name", () => {
    const parsed = parseRouteSearchParams({
      destinationLatitude: "-1.59",
      destinationLongitude: "-79",
      destinationName: `x${"y".repeat(300)}`,
    });
    expect(parsed.destinationName).toHaveLength(120);
    expect(
      parseRouteSearchParams({
        destinationLatitude: "999",
        destinationLongitude: "-79",
      }).destination,
    ).toBeNull();
  });
});
