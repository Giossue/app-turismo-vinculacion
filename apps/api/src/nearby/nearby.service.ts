import { Inject, Injectable } from "@nestjs/common";

import {
  PUBLIC_CENTER_REPOSITORY,
  type PublicCenterRepository,
} from "../centers/application/public-center.repository";
import { EstablishmentsService } from "../establishments/establishments.service";
import type { NearbyFilter, NearbyQuery } from "./nearby.query";

export type NearbyPlace =
  | Readonly<{
      kind: "center";
      code: string;
      title: string;
      subtitle: string;
      latitude: number;
      longitude: number;
      distanceMeters: number;
    }>
  | Readonly<{
      kind: "establishment";
      id: number;
      /** Actividad del catastro, para que el cliente elija el ícono. */
      activity: string;
      title: string;
      subtitle: string;
      latitude: number;
      longitude: number;
      distanceMeters: number;
    }>;

/**
 * Texto buscado en la actividad del catastro para cada filtro: `null` no
 * restringe y `undefined` deja el catastro fuera.
 */
const establishmentActivityByFilter: Record<
  NearbyFilter,
  string | null | undefined
> = {
  all: null,
  attractions: undefined,
  food: "ALIMENTOS",
  lodging: "ALOJAMIENTO",
};

/**
 * Lugares publicados alrededor de un punto, del más cercano al más lejano.
 * La coordenada solo se usa para la consulta: no se guarda ni se registra.
 */
@Injectable()
export class NearbyService {
  constructor(
    @Inject(PUBLIC_CENTER_REPOSITORY)
    private readonly centers: Pick<
      PublicCenterRepository,
      "listNearbyPublished"
    >,
    @Inject(EstablishmentsService)
    private readonly establishments: Pick<
      EstablishmentsService,
      "nearbyPublicPlaces"
    >,
  ) {}

  async list(query: NearbyQuery): Promise<readonly NearbyPlace[]> {
    const point = {
      latitude: query.latitude,
      longitude: query.longitude,
      radiusMeters: query.radiusMeters,
      limit: query.limit,
    };
    const includeCenters =
      query.filter === "all" || query.filter === "attractions";
    const activity = establishmentActivityByFilter[query.filter];

    const [centers, establishments] = await Promise.all([
      includeCenters
        ? this.centers.listNearbyPublished(point).then((page) => page.items)
        : Promise.resolve([]),
      activity === undefined
        ? Promise.resolve([])
        : this.establishments.nearbyPublicPlaces({
            ...point,
            category: activity ?? undefined,
          }),
    ]);

    const places: NearbyPlace[] = [
      ...centers.map((center) => ({
        kind: "center" as const,
        code: center.code,
        title: center.name,
        subtitle: `${center.category} · ${center.type}`,
        latitude: center.latitude,
        longitude: center.longitude,
        distanceMeters: center.distanceMeters,
      })),
      ...establishments.flatMap((item) =>
        item.latitude === null ||
        item.longitude === null ||
        item.distanceMeters === null
          ? []
          : [
              {
                kind: "establishment" as const,
                id: item.id,
                activity: item.actividad,
                title: item.nombreComercial,
                subtitle: `${item.categoriaEtiqueta ?? item.actividad} · ${item.localityName}`,
                latitude: item.latitude,
                longitude: item.longitude,
                distanceMeters: item.distanceMeters,
              },
            ],
      ),
    ];

    return places
      .sort(
        (a, b) =>
          a.distanceMeters - b.distanceMeters ||
          a.title.localeCompare(b.title, "es"),
      )
      .slice(0, query.limit);
  }
}
