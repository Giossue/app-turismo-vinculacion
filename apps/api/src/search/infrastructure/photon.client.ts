import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { z } from "zod";

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
    private readonly config: ConfigService,
    private readonly fetcher: typeof fetch = fetch,
  ) {}

  async search(
    query: string,
    coordinates?: { latitude?: number; longitude?: number },
  ): Promise<readonly PhotonPlace[]> {
    const url = new URL("/api", this.getBaseUrl());
    url.searchParams.set("q", query);
    url.searchParams.set("countrycode", "EC");
    url.searchParams.set("lang", "es");
    url.searchParams.set("limit", "8");
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
      return payload.data.features.flatMap((feature) => {
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
