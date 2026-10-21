import { describe, expect, it } from "vitest";
import type { GeoBoundingBox } from "@/core/geo/types";
import {
  formatOfflineStorageSize,
  formatOfflineStorageUsage,
  formatOfflineUpdatedAt,
  getOfflineStorageTotal,
  getOfflineStorageUsage,
  hasNewerOfflinePackage,
} from "./offline-storage-usage";

const megabyte = 1024 * 1024;
const storedPackage = {
  version: 2,
  checksumSha256: null,
  zoomMin: 8,
  zoomMax: 14,
  publishedAt: null,
};
const download = {
  savedAt: "2026-10-03T15:00:00.000Z",
  packId: "pack",
  resourceSizeBytes: 11 * megabyte,
  bounds: [-79.1, -1.7, -78.9, -1.5] as GeoBoundingBox,
};

describe("offline storage usage", () => {
  it("adds map tiles and local content", () => {
    expect(
      getOfflineStorageUsage({ download, contentSizeBytes: 2 * megabyte }),
    ).toEqual({
      mapBytes: 11 * megabyte,
      contentBytes: 2 * megabyte,
      totalBytes: 13 * megabyte,
    });
  });

  it("does not fabricate a size nobody reported", () => {
    expect(getOfflineStorageUsage({}).totalBytes).toBeNull();
    expect(
      getOfflineStorageUsage({
        download: { ...download, resourceSizeBytes: null },
        contentSizeBytes: 2048,
      }),
    ).toEqual({ mapBytes: null, contentBytes: 2048, totalBytes: 2048 });
    expect(getOfflineStorageTotal([{}, {}])).toBeNull();
  });

  it("sums every download that reports its size", () => {
    expect(
      getOfflineStorageTotal([
        { download, contentSizeBytes: megabyte },
        {},
        { contentSizeBytes: megabyte },
      ]),
    ).toBe(13 * megabyte);
  });

  it("formats sizes with Spanish decimals and the right unit", () => {
    expect(formatOfflineStorageSize(null)).toBeNull();
    expect(formatOfflineStorageSize(Number.NaN)).toBeNull();
    expect(formatOfflineStorageSize(-1)).toBeNull();
    expect(formatOfflineStorageSize(0)).toBe("0 KB");
    expect(formatOfflineStorageSize(10)).toBe("1 KB");
    expect(formatOfflineStorageSize(850 * 1024)).toBe("850 KB");
    expect(formatOfflineStorageSize(12.4 * megabyte)).toBe("12,4 MB");
    expect(formatOfflineStorageSize(1.5 * 1024 * megabyte)).toBe("1,5 GB");
  });

  it("describes the total and its parts", () => {
    expect(
      formatOfflineStorageUsage({
        mapBytes: 11 * megabyte,
        contentBytes: 1.4 * megabyte,
        totalBytes: 12.4 * megabyte,
      }),
    ).toBe("Ocupa 12,4 MB (mapa 11 MB · lugares 1,4 MB)");
    expect(
      formatOfflineStorageUsage({
        mapBytes: null,
        contentBytes: 2 * megabyte,
        totalBytes: 2 * megabyte,
      }),
    ).toBe("Ocupa 2 MB");
    expect(
      formatOfflineStorageUsage({
        mapBytes: null,
        contentBytes: null,
        totalBytes: null,
      }),
    ).toBeNull();
  });

  it("formats the last update as a Spanish date", () => {
    expect(formatOfflineUpdatedAt("2026-10-03T15:00:00.000Z")).toBe(
      "Actualizado el 3 de octubre de 2026",
    );
    expect(formatOfflineUpdatedAt(undefined)).toBeNull();
    expect(formatOfflineUpdatedAt("no es fecha")).toBeNull();
  });

  it("detects a newer package published in the catalog", () => {
    const stored = { package: storedPackage };
    expect(
      hasNewerOfflinePackage(
        { package: { ...storedPackage, version: 3 } },
        stored,
      ),
    ).toBe(true);
    expect(hasNewerOfflinePackage({ package: storedPackage }, stored)).toBe(
      false,
    );
    expect(hasNewerOfflinePackage({ package: null }, stored)).toBe(false);
    expect(hasNewerOfflinePackage({ package: storedPackage }, undefined)).toBe(
      false,
    );
  });
});
