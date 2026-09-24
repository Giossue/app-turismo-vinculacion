import { Inject, Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { z } from "zod";

export const PHOTON_FETCHER = Symbol("PHOTON_FETCHER");

const photonResponseSchema = z.object({
  features: z.array(
    z.object({
      properties: z
        .object({
          name: z.string().optional(),
          city: z.string().optional(),
          county: z.string().optional(),
          state: z.string().optional(),
          country: z.string().optional(),
          type: z.string().optional(),
          osm_value: z.string().optional(),
        })
        .passthrough(),
      geometry: z.object({
        coordinates: z.tuple([z.number().finite(), z.number().finite()]),
      }),
    }),
  ),
});

export type PhotonPlace = Readonly<{
  title: string;
  subtitle: string;
  latitude: number;
  longitude: number;
  type: string | null;
}>;

@Injectable()
export class PhotonClient {
  constructor(
    @Inject(ConfigService) private readonly config: ConfigService,
    @Inject(PHOTON_FETCHER) private readonly fetcher: typeof fetch,
  ) {}

  async search(
    query: string,
    coordinates?: { latitude?: number; longitude?: number },
  ): Promise<readonly PhotonPlace[]> {
    const url = new URL("/api", this.getBaseUrl());
    url.searchParams.set("q", query);
    url.searchParams.set("countrycode", "EC");
    // Photon solo acepta idiomas que fueron incluidos en su índice. `default`
    // delega en la configuración de la instancia y evita asumir que existe
    // un índice español en todos los despliegues.
    url.searchParams.set("lang", "default");
    url.searchParams.set("limit", "8");
    for (const layer of [
      "city",
      "county",
      "district",
      "locality",
      "street",
      "house",
    ]) {
      url.searchParams.append("layer", layer);
    }
    if (
      coordinates?.latitude !== undefined &&
      coordinates.longitude !== undefined
    ) {
      url.searchParams.set("lat", String(coordinates.latitude));
      url.searchParams.set("lon", String(coordinates.longitude));
    }

    const controller = new AbortController();
    const timeout = setTimeout(
      () => controller.abort(),
      this.config.getOrThrow<number>("GEOCODING_REQUEST_TIMEOUT_MS"),
    );
    try {
      const response = await this.fetcher(url, {
        headers: { Accept: "application/json" },
        signal: controller.signal,
      });
      if (!response.ok) return [];
      const payload = photonResponseSchema.safeParse(await response.json());
      if (!payload.success) return [];
      const places = payload.data.features.flatMap((feature) => {
        const name = feature.properties.name?.trim();
        if (!name) return [];
        const subtitle = [
          feature.properties.city,
          feature.properties.county,
          feature.properties.state,
          feature.properties.country,
        ]
          .filter(
            (value, index, values) => value && values.indexOf(value) === index,
          )
          .join(", ");
        const [longitude, latitude] = feature.geometry.coordinates;
        return [
          {
            title: name,
            subtitle,
            latitude,
            longitude,
            type:
              feature.properties.type ?? feature.properties.osm_value ?? null,
          },
        ];
      });
      return selectPreferredPlaces(query, places);
    } catch {
      // La búsqueda propia no depende de Photon. El catálogo continúa disponible.
      return [];
    } finally {
      clearTimeout(timeout);
    }
  }

  private getBaseUrl(): string {
    return this.config
      .getOrThrow<string>("GEOCODING_PHOTON_URL")
      .replace(/\/+$/, "");
  }
}

export function selectPreferredPlaces(
  query: string,
  places: readonly PhotonPlace[],
): readonly PhotonPlace[] {
  const normalizedQuery = normalizeSearchText(query);
  const exactMatches = places.filter(
    (place) => normalizeSearchText(place.title) === normalizedQuery,
  );
  if (exactMatches.length <= 1) return places;

  const preferredExactMatch = [...exactMatches].sort(
    (left, right) =>
      placeTypePriority(left.type) - placeTypePriority(right.type),
  )[0];
  if (!preferredExactMatch) return places;

  return [
    preferredExactMatch,
    ...places.filter(
      (place) => normalizeSearchText(place.title) !== normalizedQuery,
    ),
  ].slice(0, 8);
}

function normalizeSearchText(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLocaleLowerCase("es");
}

function placeTypePriority(type: string | null): number {
  switch (type) {
    case "city":
      return 0;
    case "county":
      return 1;
    case "district":
      return 2;
    case "locality":
      return 3;
    case "street":
      return 4;
    case "house":
      return 5;
    default:
      return 6;
  }
}
