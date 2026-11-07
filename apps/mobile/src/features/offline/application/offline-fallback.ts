import type {
  PublicCenter,
  PublicCenterDetail,
} from "@/features/centers/domain/public-center";

import type { PublicEstablishmentDetail } from "@/features/establishments/domain/establishment";
import type {
  NearbyPlace,
  NearbyPlacesQuery,
} from "@/features/nearby/domain/nearby-place";
import { buildOfflineNearbyPlaces } from "@/features/nearby/domain/offline-nearby-places";
import {
  listStoredOfflineCenterRecords,
  listStoredOfflineManifests,
} from "../data/offline-storage";

export async function getStoredOfflineCenters(): Promise<
  readonly PublicCenter[]
> {
  const records = await listStoredOfflineCenterRecords();
  return records.map(({ center }) => center);
}

export async function getStoredOfflineCenter(
  code: string,
): Promise<PublicCenterDetail | null> {
  const record = (await listStoredOfflineCenterRecords(code))[0];
  if (record) {
    const { center, cityName } = record;
    return {
      ...center,
      address: null,
      admission: null,
      activities: [],
      accessibility: [],
      altitudeMeters: null,
      facilities: [],
      photos: [],
      touristZone: cityName,
    };
  }
  return null;
}

/** Las descargas no traen fotos: la ficha muestra el resto de los datos. */
export async function getStoredOfflineEstablishment(
  id: number,
): Promise<PublicEstablishmentDetail | null> {
  const manifests = await listStoredOfflineManifests();
  for (const manifest of manifests) {
    const place = manifest.establishments.find((item) => item.id === id);
    if (place) {
      return {
        id,
        nombreComercial: place.name,
        actividad: place.activity,
        clasificacion: place.classification,
        categoria: place.category,
        categoriaEtiqueta: place.categoryLabel,
        direccion: place.address,
        telefono: place.phone,
        latitude: place.latitude,
        longitude: place.longitude,
        distanceMeters: null,
        localityName: place.localityName,
        photos: [],
      };
    }
  }
  return null;
}

/** `null` sin descargas: quien llama conserva el error de conexión. */
export async function getStoredOfflineNearbyPlaces(
  query: NearbyPlacesQuery,
): Promise<readonly NearbyPlace[] | null> {
  const manifests = await listStoredOfflineManifests();
  return manifests.length ? buildOfflineNearbyPlaces(manifests, query) : null;
}
