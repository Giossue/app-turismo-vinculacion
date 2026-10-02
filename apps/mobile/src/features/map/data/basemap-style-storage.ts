import AsyncStorage from "@react-native-async-storage/async-storage";
import type { StyleSpecification } from "@maplibre/maplibre-react-native";

import type { TurismoColorScheme } from "@/core/ui/tokens";
import { isValidBasemapStyle } from "./basemap-style";

const storageKey = "turismo-vinculacion-basemap-style:v1";

export async function readStoredBasemapStyle(
  scheme: TurismoColorScheme,
  styleUrl: string,
): Promise<StyleSpecification | null> {
  const json = await AsyncStorage.getItem(storageKey);
  if (!json) return null;
  try {
    const value: unknown = JSON.parse(json);
    if (!value || typeof value !== "object") return null;
    const stored = value as Record<string, unknown>;
    if (stored.styleUrl !== styleUrl || !stored.styles || typeof stored.styles !== "object") {
      return null;
    }
    const style = (stored.styles as Record<string, unknown>)[scheme];
    return isValidBasemapStyle(style) ? style : null;
  } catch {
    return null;
  }
}

export async function saveStoredBasemapStyles(
  styles: Readonly<Record<TurismoColorScheme, StyleSpecification>>,
  styleUrl: string,
): Promise<void> {
  await AsyncStorage.setItem(storageKey, JSON.stringify({ styleUrl, styles }));
}
