import { publicCenterSchema } from "@/features/centers/data/public-centers-api";
import { openDatabaseAsync, type SQLiteDatabase } from "expo-sqlite";

import type {
  OfflineCityManifest,
  OfflineCitySummary,
} from "../domain/offline-city";
import {
  parseStoredOfflineManifest,
  parseStoredOfflineSummary,
} from "./offline-api";

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
  const database = await openDatabaseAsync("rumbo-ec-offline.db");
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
  const manifests = await listStoredOfflineSummaries();
  return manifests.map((manifest) => manifest.city.slug);
}

export async function getStoredOfflineManifest(
  slug: string,
): Promise<OfflineCityManifest | null> {
  const database = await getDatabase();
  const row = await database.getFirstAsync<{ payload_json: string }>(
    "SELECT payload_json FROM offline_city_manifests WHERE city_slug = ?",
    slug,
  );
  return row ? parseStoredOfflineManifest(row.payload_json) : null;
}

export async function removeOfflineManifest(slug: string): Promise<void> {
  const database = await getDatabase();
  await database.runAsync(
    "DELETE FROM offline_city_manifests WHERE city_slug = ?",
    slug,
  );
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

/** JSON1 devuelve solo metadatos; el contenido grande permanece en SQLite. */
export async function listStoredOfflineSummaries(): Promise<
  readonly OfflineCitySummary[]
> {
  const database = await getDatabase();
  const rows = await database.getAllAsync<{ summary_json: string }>(`
    SELECT json_object(
      'city', json_extract(payload_json, '$.city'),
      'package', json_extract(payload_json, '$.package'),
      'bounds', json_extract(payload_json, '$.bounds'),
      'download', json_remove(CASE WHEN json_type(payload_json, '$.download') = 'object' THEN json_extract(payload_json, '$.download') ELSE NULL END, '$.mapStyles'),
      'counts', json_object(
        'centers', COALESCE(json_array_length(payload_json, '$.centers'), 0),
        'establishments', COALESCE(json_array_length(payload_json, '$.establishments'), 0),
        'pois', COALESCE(json_array_length(payload_json, '$.pois'), 0),
        'routes', COALESCE(json_array_length(payload_json, '$.routes'), 0)
      )
    ) AS summary_json FROM offline_city_manifests WHERE json_valid(payload_json) ORDER BY city_slug
  `);
  return rows.flatMap(({ summary_json }) => {
    const summary = parseStoredOfflineSummary(summary_json);
    return summary ? [summary] : [];
  });
}

/** La ficha local no necesita deserializar establecimientos, rutas ni estilos. */
export async function listStoredOfflineCenterRecords(code?: string) {
  const database = await getDatabase();
  const rows = await database.getAllAsync<{
    center_json: string;
    city_name: string;
  }>(
    `
    SELECT center.value AS center_json, json_extract(manifest.payload_json, '$.city.name') AS city_name
    FROM offline_city_manifests AS manifest, json_each(CASE WHEN json_valid(manifest.payload_json) THEN manifest.payload_json ELSE '{}' END, '$.centers') AS center
    WHERE center.type = 'object' ${code ? "AND json_extract(CASE WHEN center.type = 'object' THEN center.value ELSE '{}' END, '$.code') = ?" : ""}
    ORDER BY manifest.city_slug
  `,
    ...(code ? [code] : []),
  );
  return rows.flatMap((row) => {
    try {
      const center = publicCenterSchema.safeParse(JSON.parse(row.center_json));
      return center.success && typeof row.city_name === "string"
        ? [{ center: center.data, cityName: row.city_name }]
        : [];
    } catch {
      return [];
    }
  });
}
