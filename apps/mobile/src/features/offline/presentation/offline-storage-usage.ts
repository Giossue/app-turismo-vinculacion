import type { OfflineCity, OfflineCitySummary } from "../domain/offline-city";
import { getAppLocale, messages } from "@/core/i18n/language";
import { formatLongDate } from "@/core/format/date";

const kilobyte = 1024;
const megabyte = kilobyte * 1024;
const gigabyte = megabyte * 1024;

type StoredSize = Pick<OfflineCitySummary, "contentSizeBytes" | "download">;

/** Space a download occupies on the device: map tiles plus local content. */
export type OfflineStorageUsage = Readonly<{
  mapBytes: number | null;
  contentBytes: number | null;
  totalBytes: number | null;
}>;

function validBytes(bytes: number | null | undefined): number | null {
  return bytes != null && Number.isFinite(bytes) && bytes >= 0 ? bytes : null;
}

export function getOfflineStorageUsage(
  summary: StoredSize,
): OfflineStorageUsage {
  const mapBytes = validBytes(summary.download?.resourceSizeBytes);
  const contentBytes = validBytes(summary.contentSizeBytes);
  return {
    mapBytes,
    contentBytes,
    totalBytes:
      mapBytes === null && contentBytes === null
        ? null
        : (mapBytes ?? 0) + (contentBytes ?? 0),
  };
}

/** Sum of every download; `null` when none reports its size. */
export function getOfflineStorageTotal(
  summaries: readonly StoredSize[],
): number | null {
  let total: number | null = null;
  for (const summary of summaries) {
    const { totalBytes } = getOfflineStorageUsage(summary);
    if (totalBytes !== null) total = (total ?? 0) + totalBytes;
  }
  return total;
}

/** "850 KB", "12,4 MB" or "1,2 GB". */
export function formatOfflineStorageSize(
  bytes: number | null | undefined,
): string | null {
  const value = validBytes(bytes);
  if (value === null) return null;
  if (value >= gigabyte) return `${formatDecimal(value / gigabyte)} GB`;
  if (value >= megabyte) return `${formatDecimal(value / megabyte)} MB`;
  // Never show "0 KB" for content that exists.
  const kilobytes = value > 0 ? Math.max(1, Math.round(value / kilobyte)) : 0;
  return `${kilobytes.toLocaleString(getAppLocale())} KB`;
}

function formatDecimal(value: number): string {
  return value.toLocaleString(getAppLocale(), { maximumFractionDigits: 1 });
}

/** "Ocupa 12,4 MB (mapa 11 MB · lugares 1,4 MB)". */
export function formatOfflineStorageUsage(
  usage: OfflineStorageUsage,
): string | null {
  const total = formatOfflineStorageSize(usage.totalBytes);
  if (!total) return null;
  const map = formatOfflineStorageSize(usage.mapBytes);
  const content = formatOfflineStorageSize(usage.contentBytes);
  const text = messages().offline.usage;
  return map && content
    ? text.occupiesDetail(total, map, content)
    : text.occupies(total);
}

/** "Actualizado el 3 de octubre de 2026". */
export function formatOfflineUpdatedAt(
  savedAt: string | null | undefined,
): string | null {
  if (!savedAt) return null;
  const date = new Date(savedAt);
  if (Number.isNaN(date.getTime())) return null;
  return messages().offline.usage.updatedAt(formatLongDate(date));
}

/** The catalog publishes a newer package than the one on the device. */
export function hasNewerOfflinePackage(
  catalogCity: Pick<OfflineCity, "package">,
  stored: Pick<OfflineCitySummary, "package"> | undefined,
): boolean {
  return Boolean(
    stored &&
    catalogCity.package &&
    catalogCity.package.version > stored.package.version,
  );
}
