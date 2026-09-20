import AsyncStorage from "@react-native-async-storage/async-storage";

import type { PublicCenter } from "@/features/centers/domain/public-center";

const storageKey = "turismo-vinculacion-saved-centers-v1";

export async function listSavedCenters(): Promise<readonly PublicCenter[]> {
  const raw = await AsyncStorage.getItem(storageKey);
  if (!raw) return [];

  try {
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(isPublicCenter);
  } catch {
    return [];
  }
}

export async function saveCenter(center: PublicCenter): Promise<void> {
  const current = await listSavedCenters();
  const next = [center, ...current.filter((item) => item.code !== center.code)];
  await AsyncStorage.setItem(storageKey, JSON.stringify(next));
}

export async function removeSavedCenter(code: string): Promise<void> {
  const current = await listSavedCenters();
  await AsyncStorage.setItem(
    storageKey,
    JSON.stringify(current.filter((item) => item.code !== code)),
  );
}

function isPublicCenter(value: unknown): value is PublicCenter {
  if (!value || typeof value !== "object") return false;
  const center = value as Partial<PublicCenter>;
  return (
    typeof center.code === "string" &&
    center.code.length > 0 &&
    typeof center.name === "string" &&
    (typeof center.description === "string" || center.description === null) &&
    typeof center.latitude === "number" &&
    typeof center.longitude === "number" &&
    typeof center.category === "string" &&
    typeof center.type === "string" &&
    typeof center.subtype === "string" &&
    (typeof center.hierarchy === "string" || center.hierarchy === null) &&
    typeof center.categoryCode === "string" &&
    typeof center.typeCode === "string" &&
    typeof center.subtypeCode === "string" &&
    typeof center.provinceCode === "string" &&
    typeof center.cantonCode === "string" &&
    typeof center.parishCode === "string" &&
    (typeof center.hierarchyCode === "string" || center.hierarchyCode === null)
  );
}
