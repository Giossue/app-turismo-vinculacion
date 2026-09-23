import { describe, expect, it, vi } from "vitest";

import { ApiError } from "@/core/api/http";
import {
  getOfflineDownloadErrorMessage,
  getOfflineDownloadsSnapshot,
  OfflineDownloadError,
  runOfflineDownload,
  subscribeOfflineDownloads,
  type OfflineDownloadTask,
} from "./offline-download-store";

function deferredTask() {
  let resolve!: () => void;
  let reject!: (error: Error) => void;
  let reportProgress!: (percentage: number) => void;
  const task = vi.fn<OfflineDownloadTask>(
    (onProgress) =>
      new Promise<void>((resolvePromise, rejectPromise) => {
        reportProgress = onProgress;
        resolve = resolvePromise;
        reject = rejectPromise;
      }),
  );
  return {
    reject: (error: Error) => reject(error),
    reportProgress: (percentage: number) => reportProgress(percentage),
    resolve: () => resolve(),
    task,
  };
}

describe("offline download store", () => {
  it("joins a download already in flight for the same city", async () => {
    const first = deferredTask();
    const second = deferredTask();

    const download = runOfflineDownload("guaranda", first.task);
    const repeated = runOfflineDownload("guaranda", second.task);

    expect(repeated).toBe(download);
    expect(second.task).not.toHaveBeenCalled();
    first.resolve();
    await download;
  });

  it("publishes progress while downloading and clears it afterwards", async () => {
    const listener = vi.fn();
    const unsubscribe = subscribeOfflineDownloads(listener);
    const pending = deferredTask();

    const download = runOfflineDownload("guaranda", pending.task);
    expect(getOfflineDownloadsSnapshot().get("guaranda")).toBe(0);
    pending.reportProgress(41.6);
    expect(getOfflineDownloadsSnapshot().get("guaranda")).toBe(42);

    pending.resolve();
    await download;
    expect(getOfflineDownloadsSnapshot().has("guaranda")).toBe(false);
    expect(listener).toHaveBeenCalled();
    unsubscribe();
  });

  it("allows a new download once the previous one failed", async () => {
    const failing = deferredTask();
    const download = runOfflineDownload("guaranda", failing.task);
    failing.reject(new Error("network"));
    await expect(download).rejects.toThrow("network");

    const retry = deferredTask();
    const retried = runOfflineDownload("guaranda", retry.task);
    expect(retry.task).toHaveBeenCalledOnce();
    retry.resolve();
    await retried;
  });

  it("shows safe messages and hides technical ones", () => {
    expect(
      getOfflineDownloadErrorMessage(
        new OfflineDownloadError("La ciudad no tiene un paquete publicado."),
      ),
    ).toBe("La ciudad no tiene un paquete publicado.");
    expect(
      getOfflineDownloadErrorMessage(
        new ApiError("Esta ciudad aún no tiene paquete offline."),
      ),
    ).toBe("Esta ciudad aún no tiene paquete offline.");
    expect(
      getOfflineDownloadErrorMessage(new Error("Offline pack HTTP 500")),
    ).toBe(
      "No pudimos descargar la ciudad. Revisa tu conexión e inténtalo de nuevo.",
    );
  });
});
