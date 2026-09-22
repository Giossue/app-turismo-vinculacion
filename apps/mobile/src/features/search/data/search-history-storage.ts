import { z } from "zod";

import { readJson, removeJson, writeJson } from "@/core/storage/json-storage";

const storageKey = "turismo-vinculacion-search-history-v1";
const maxEntries = 8;

export async function listSearchHistory(): Promise<readonly string[]> {
  const stored = await readJson(storageKey, z.array(z.unknown()));
  return (stored ?? []).filter(
    (value): value is string =>
      typeof value === "string" && value.trim().length > 0,
  );
}

/** Moves `query` to the top of the history and returns the updated list. */
export async function rememberSearch(
  query: string,
): Promise<readonly string[]> {
  const current = await listSearchHistory();
  const normalized = query.trim();
  if (!normalized) return current;

  const next = [
    normalized,
    ...current.filter(
      (item) => item.toLocaleLowerCase() !== normalized.toLocaleLowerCase(),
    ),
  ].slice(0, maxEntries);
  await writeJson(storageKey, next);
  return next;
}

export async function clearSearchHistory(): Promise<void> {
  await removeJson(storageKey);
}
