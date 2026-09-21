import AsyncStorage from "@react-native-async-storage/async-storage";

const storageKey = "turismo-vinculacion-search-history-v1";
const maxEntries = 8;

export async function listSearchHistory(): Promise<readonly string[]> {
  const raw = await AsyncStorage.getItem(storageKey);
  if (!raw) return [];

  try {
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (value): value is string =>
        typeof value === "string" && value.trim().length > 0,
    );
  } catch {
    return [];
  }
}

export async function rememberSearch(query: string): Promise<void> {
  const normalized = query.trim();
  if (!normalized) return;

  const current = await listSearchHistory();
  const next = [
    normalized,
    ...current.filter(
      (item) => item.toLocaleLowerCase() !== normalized.toLocaleLowerCase(),
    ),
  ].slice(0, maxEntries);
  await AsyncStorage.setItem(storageKey, JSON.stringify(next));
}

export async function clearSearchHistory(): Promise<void> {
  await AsyncStorage.removeItem(storageKey);
}
