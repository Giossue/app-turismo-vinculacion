import type { StyleSpecification } from "@maplibre/maplibre-react-native";
import { z } from "zod";

import { readJson, writeJson } from "@/core/storage/json-storage";
import type { TurismoColorScheme } from "@/core/ui/tokens";
import { isValidBasemapStyle } from "./basemap-style";

const storageKey = "turismo-vinculacion-basemap-style:v1";

// Each scheme is validated on its own: a corrupt dark style must not discard
// a valid light one.
const storedStylesSchema = z.object({
  styleUrl: z.string(),
  styles: z.record(z.string(), z.unknown()),
});

export async function readStoredBasemapStyle(
  scheme: TurismoColorScheme,
  styleUrl: string,
): Promise<StyleSpecification | null> {
  const stored = await readJson(storageKey, storedStylesSchema);
  if (!stored || stored.styleUrl !== styleUrl) return null;
  const style = stored.styles[scheme];
  return isValidBasemapStyle(style) ? style : null;
}

export async function saveStoredBasemapStyles(
  styles: Readonly<Record<TurismoColorScheme, StyleSpecification>>,
  styleUrl: string,
): Promise<void> {
  await writeJson(storageKey, { styleUrl, styles });
}
