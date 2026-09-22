import { isApiUnavailableError } from "@/core/api/http";
import type { AuthorizedFetcher } from "@/features/auth/data/auth-api";
import { saveRemoteCenter } from "../data/favorites-api";
import {
  listLegacySavedCenters,
  replaceLegacySavedCenters,
} from "../data/saved-centers-storage";

/**
 * Uploads the device's pre-account saved places to the signed-in account and
 * then forgets them, so a later account on the same device does not inherit
 * them. Only uploads that failed because the API was unreachable are kept
 * for the next attempt.
 */
export async function importLegacySavedCenters(
  request: AuthorizedFetcher,
): Promise<void> {
  const legacyCenters = await listLegacySavedCenters();
  if (!legacyCenters.length) return;

  const results = await Promise.allSettled(
    legacyCenters.map((center) => saveRemoteCenter(center.code, request)),
  );
  const pending = legacyCenters.filter((_, index) => {
    const result = results[index];
    return result.status === "rejected" && isApiUnavailableError(result.reason);
  });
  await replaceLegacySavedCenters(pending);
}
