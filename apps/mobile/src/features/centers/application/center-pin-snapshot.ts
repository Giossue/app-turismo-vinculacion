import { queryOptions } from "@tanstack/react-query";

import { isApiUnavailableError } from "@/core/api/http";
import { ONE_DAY_MS, queryKeys } from "@/core/api/query-keys";
import type { GeoBounds } from "@/core/geo/types";
import {
  readCenterPinSnapshot,
  saveCenterPinSnapshot,
} from "../data/center-pin-snapshot-storage";
import { getPublishedMapCenterPage } from "../data/public-centers-api";
import type { PublicCenter } from "../domain/public-center";

/** Todo el país, Galápagos incluido: la copia no revela qué zona se miró. */
const ecuadorBounds: GeoBounds = {
  west: -92.1,
  south: -5.1,
  east: -75.1,
  north: 1.7,
};
// Tope del tamaño en disco; AsyncStorage no admite valores muy grandes.
const maxSnapshotPins = 2_000;
const emptyCenters: readonly PublicCenter[] = [];
const filterFields = [
  "categoryCode",
  "typeCode",
  "subtypeCode",
  "provinceCode",
  "cantonCode",
  "parishCode",
] as const;

type SnapshotFilters = Partial<
  Record<(typeof filterFields)[number], string | undefined>
>;

async function fetchCountryPins(signal: AbortSignal) {
  const centers: PublicCenter[] = [];
  while (centers.length < maxSnapshotPins) {
    const page = await getPublishedMapCenterPage(
      { bounds: ecuadorBounds },
      centers.length,
      { signal },
    );
    centers.push(...page.data);
    if (page.data.length === 0 || centers.length >= page.meta.total) break;
  }
  return centers;
}

/**
 * Pines de todo el país para arrancar sin conexión y sin una ciudad
 * descargada. Se renueva una vez al día y nunca guarda el área visible.
 */
export function getCenterPinSnapshotQueryOptions() {
  return queryOptions({
    queryKey: queryKeys.centerPinSnapshot,
    queryFn: async ({ signal }): Promise<readonly PublicCenter[]> => {
      const stored = await readCenterPinSnapshot();
      if (stored && Date.now() - stored.savedAt < ONE_DAY_MS) {
        return stored.centers;
      }
      try {
        const centers = await fetchCountryPins(signal);
        await saveCenterPinSnapshot(centers).catch(() => undefined);
        return centers;
      } catch (error) {
        if (stored && isApiUnavailableError(error)) return stored.centers;
        throw error;
      }
    },
    networkMode: "offlineFirst",
    staleTime: ONE_DAY_MS,
    retry: false,
  });
}

/** La copia no pasa por la API: los filtros de Explorar se aplican aquí. */
export function selectSnapshotCenters(
  centers: readonly PublicCenter[] | undefined,
  filters: SnapshotFilters,
): readonly PublicCenter[] {
  if (!centers) return emptyCenters;
  const active = filterFields.filter((field) => filters[field]);
  if (active.length === 0) return centers;
  return centers.filter((center) =>
    active.every((field) => center[field] === filters[field]),
  );
}
