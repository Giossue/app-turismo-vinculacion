import { ApiError } from "@/core/api/http";

/** Progress (0–100) of each city download in flight, by slug. */
export type OfflineDownloadsSnapshot = ReadonlyMap<string, number>;

export type OfflineDownloadTask = (
  onProgress: (percentage: number) => void,
) => Promise<void>;

/** A download failure whose message is already safe to show. */
export class OfflineDownloadError extends Error {
  constructor(message: string, options: Readonly<{ cause?: unknown }> = {}) {
    super(message, { cause: options.cause });
    this.name = "OfflineDownloadError";
  }
}

const genericDownloadMessage =
  "No pudimos descargar la ciudad. Revisa tu conexión e inténtalo de nuevo.";

const inFlight = new Map<string, Promise<void>>();
const removals = new Map<string, Promise<void>>();
const listeners = new Set<() => void>();
let snapshot: OfflineDownloadsSnapshot = new Map();

/**
 * Runs at most one download per city. A second request for a city already
 * downloading (a double tap, or reopening the screen) joins the same
 * promise instead of starting a download that would compete with it.
 */
export function runOfflineDownload(
  slug: string,
  task: OfflineDownloadTask,
): Promise<void> {
  if (removals.has(slug)) {
    return Promise.reject(
      new OfflineDownloadError("Espera a que termine de borrarse esta ciudad."),
    );
  }
  const current = inFlight.get(slug);
  if (current) return current;

  setProgress(slug, 0);
  const download = task((percentage) => setProgress(slug, percentage)).finally(
    () => {
      inFlight.delete(slug);
      clearProgress(slug);
    },
  );
  inFlight.set(slug, download);
  return download;
}

/** Removal and replacement never compete for the same city's resources. */
export function runOfflineRemoval(
  slug: string,
  task: () => Promise<void>,
): Promise<void> {
  const current = removals.get(slug);
  if (current) return current;
  if (inFlight.has(slug)) {
    return Promise.reject(
      new OfflineDownloadError(
        "Espera a que termine la descarga de esta ciudad.",
      ),
    );
  }
  const removal = Promise.resolve()
    .then(task)
    .finally(() => removals.delete(slug));
  removals.set(slug, removal);
  return removal;
}

/** For `useSyncExternalStore`: downloads survive leaving the screen. */
export function subscribeOfflineDownloads(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function getOfflineDownloadsSnapshot(): OfflineDownloadsSnapshot {
  return snapshot;
}

/** Spanish, non-technical copy for any download failure. */
export function getOfflineDownloadErrorMessage(error: unknown): string {
  return error instanceof OfflineDownloadError || error instanceof ApiError
    ? error.message
    : genericDownloadMessage;
}

function setProgress(slug: string, percentage: number): void {
  const progress = Math.max(0, Math.min(100, Math.round(percentage)));
  if (snapshot.get(slug) === progress) return;
  snapshot = new Map(snapshot).set(slug, progress);
  notify();
}

function clearProgress(slug: string): void {
  if (!snapshot.has(slug)) return;
  const next = new Map(snapshot);
  next.delete(slug);
  snapshot = next;
  notify();
}

function notify(): void {
  for (const listener of listeners) listener();
}
