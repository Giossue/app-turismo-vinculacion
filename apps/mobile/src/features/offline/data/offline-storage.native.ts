import { openDatabaseAsync, type SQLiteDatabase } from "expo-sqlite";

import type { OfflineCityManifest } from "../domain/offline-city";

let databasePromise: Promise<SQLiteDatabase> | null = null;

async function getDatabase(): Promise<SQLiteDatabase> {
  databasePromise ??= openDatabaseAsync("turismo-vinculacion-offline.db");
  const database = await databasePromise;
  await database.execAsync(`
    PRAGMA journal_mode = WAL;
    PRAGMA foreign_keys = ON;
    CREATE TABLE IF NOT EXISTS offline_city_manifests (
      city_slug TEXT PRIMARY KEY NOT NULL,
      package_version INTEGER NOT NULL,
      payload_json TEXT NOT NULL,
      saved_at TEXT NOT NULL
    );
  `);
  return database;
}

export async function saveOfflineManifest(
  manifest: OfflineCityManifest,
): Promise<void> {
  const database = await getDatabase();
  await database.runAsync(
    `INSERT OR REPLACE INTO offline_city_manifests
      (city_slug, package_version, payload_json, saved_at)
     VALUES (?, ?, ?, ?)`,
    manifest.city.slug,
    manifest.package.version,
    JSON.stringify(manifest),
    new Date().toISOString(),
  );
}

export async function listStoredOfflineCities(): Promise<readonly string[]> {
  const database = await getDatabase();
  const rows = await database.getAllAsync<{ city_slug: string }>(
    "SELECT city_slug FROM offline_city_manifests ORDER BY city_slug",
  );
  return rows.map((row) => row.city_slug);
}

export async function listStoredOfflineManifests(): Promise<
  readonly OfflineCityManifest[]
> {
  const database = await getDatabase();
  const rows = await database.getAllAsync<{ payload_json: string }>(
    "SELECT payload_json FROM offline_city_manifests ORDER BY city_slug",
  );
  return rows.map((row) => JSON.parse(row.payload_json) as OfflineCityManifest);
}

export async function deleteStoredOfflineCity(slug: string): Promise<void> {
  const database = await getDatabase();
  await database.runAsync(
    "DELETE FROM offline_city_manifests WHERE city_slug = ?",
    slug,
  );
}
