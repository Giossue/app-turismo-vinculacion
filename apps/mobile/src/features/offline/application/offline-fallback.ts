import type {
  PublicCenter,
  PublicCenterDetail,
} from "@/features/centers/domain/public-center";

import { listStoredOfflineCenterRecords } from "../data/offline-storage";

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
