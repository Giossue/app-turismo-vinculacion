import AsyncStorage from "@react-native-async-storage/async-storage";
import type { z } from "zod";

/**
 * Reads a JSON value from AsyncStorage. Missing, unreadable, malformed or
 * schema-invalid entries all resolve to `null`: local caches are best-effort
 * and must never break a screen.
 */
export async function readJson<T>(
  key: string,
  schema: z.ZodType<T>,
): Promise<T | null> {
  try {
    const raw = await AsyncStorage.getItem(key);
    if (raw === null) return null;
    const parsed = schema.safeParse(JSON.parse(raw));
    return parsed.success ? parsed.data : null;
  } catch {
    return null;
  }
}

/** Writes a JSON value. Storage failures propagate to the caller. */
export async function writeJson(key: string, value: unknown): Promise<void> {
  await AsyncStorage.setItem(key, JSON.stringify(value));
}

export async function removeJson(key: string): Promise<void> {
  await AsyncStorage.removeItem(key);
}
