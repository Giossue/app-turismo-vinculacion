import { openDatabaseAsync, type SQLiteDatabase } from "expo-sqlite";

import type { OfflineCityManifest } from "../domain/offline-city";
import { parseStoredOfflineManifest } from "./offline-api";

let databasePromise: Promise<SQLiteDatabase> | null = null;

/** Opens and migrates the database once; a failed attempt can be retried. */
function getDatabase(): Promise<SQLiteDatabase> {
  databasePromise ??= openOfflineDatabase().catch((error: unknown) => {
    databasePromise = null;
    throw error;
  });
  return databasePromise;
}

async function openOfflineDatabase(): Promise<SQLiteDatabase> {
  const database = await openDatabaseAsync("turismo-vinculacion-offline.db");
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
  return rows.flatMap((row) => {
    const manifest = parseStoredOfflineManifest(row.payload_json);
    return manifest ? [manifest] : [];
  });
}
