import type {
  PublicCenter,
  PublicCenterDetail,
} from "@/features/centers/domain/public-center";

import { listStoredOfflineManifests } from "../data/offline-storage";

export async function getStoredOfflineCenters(): Promise<
  readonly PublicCenter[]
> {
  const manifests = await listStoredOfflineManifests();
  return manifests.flatMap((manifest) =>
    manifest.centers.map((center) => ({
      ...center,
      description: center.description,
    })),
  );
}

export async function getStoredOfflineCenter(
  code: string,
): Promise<PublicCenterDetail | null> {
  const manifests = await listStoredOfflineManifests();
  for (const manifest of manifests) {
    const center = manifest.centers.find((item) => item.code === code);
    if (!center) continue;
    return {
      ...center,
      address: null,
      admission: null,
      activities: [],
      accessibility: [],
      altitudeMeters: null,
      facilities: [],
      photos: [],
      touristZone: manifest.city.name,
    };
  }
  return null;
}
