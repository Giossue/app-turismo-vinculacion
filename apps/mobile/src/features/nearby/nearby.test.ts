import { describe, expect, it, vi } from "vitest";

import { isPersistedQueryKey, queryKeys } from "@/core/api/query-keys";
import { getNearbyPlaces } from "./data/nearby-api";
import {
  getNearbyPlaceIcon,
  getNearbyPlaceKey,
  toNearbyQueryPoint,
  type NearbyPlace,
} from "./domain/nearby-place";

const center: NearbyPlace = {
  kind: "center",
  code: "C-1",
  title: "Cascada",
  subtitle: "Atractivos naturales · Ríos",
  latitude: -1.6,
  longitude: -79,
  distanceMeters: 800,
};

const establishment = (activity: string): NearbyPlace => ({
  kind: "establishment",
  id: 7,
  activity,
  title: "Café Central",
  subtitle: "CAFETERÍA · Guaranda",
  latitude: -1.59,
  longitude: -79.01,
  distanceMeters: 300,
});

describe("nearby place domain", () => {
  it("rounds the query point to about 100 m", () => {
    expect(
      toNearbyQueryPoint({ latitude: -1.592_49, longitude: -79.001_51 }),
    ).toEqual({ latitude: -1.592, longitude: -79.002 });
  });

  it("builds a key per kind", () => {
    expect(getNearbyPlaceKey(center)).toBe("center:C-1");
    expect(getNearbyPlaceKey(establishment("ALOJAMIENTO"))).toBe(
      "establishment:7",
    );
  });

  it("picks an icon from the kind and activity", () => {
    expect(getNearbyPlaceIcon(center)).toBe("landmark");
    expect(getNearbyPlaceIcon(establishment("ALOJAMIENTO"))).toBe("hotel");
    expect(
      getNearbyPlaceIcon(establishment("ALIMENTOS, BEBIDAS Y ENTRETENIMIENTO")),
    ).toBe("restaurant");
    expect(getNearbyPlaceIcon(establishment("AGENCIAMIENTO TURÍSTICO"))).toBe(
      "store",
    );
  });

  it("never persists GPS-derived results", () => {
    expect(isPersistedQueryKey([...queryKeys.nearbyPlaces, {}])).toBe(false);
  });
});

describe("getNearbyPlaces", () => {
  it("sends the point and filter and validates the items", async () => {
    const fetcher = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          data: { items: [establishment("ALOJAMIENTO"), center] },
        }),
        { headers: { "Content-Type": "application/json" }, status: 200 },
      ),
    );

    const items = await getNearbyPlaces(
      { latitude: -1.592, longitude: -79.002, filter: "lodging" },
      { apiUrl: "https://api.test", fetcher },
    );

    expect(items.map(getNearbyPlaceKey)).toEqual([
      "establishment:7",
      "center:C-1",
    ]);
    expect(String(fetcher.mock.calls[0]?.[0])).toBe(
      "https://api.test/nearby?latitude=-1.592&longitude=-79.002&filter=lodging",
    );
  });
});
