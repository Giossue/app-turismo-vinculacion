import { z } from "zod";

import { getApiUrl } from "@/core/api/api-url";
import { acceptJsonHeaders, requestJson, type Fetcher } from "@/core/api/http";
import { messages } from "@/core/i18n/language";

const latestVersionSchema = z.object({
  data: z
    .object({
      version: z.string().regex(/^\d+\.\d+\.\d+$/),
      notes: z.string(),
      downloadPath: z.string().startsWith("/"),
    })
    .nullable(),
});

export type LatestAppVersion = Readonly<{
  version: string;
  notes: string;
  /** Página de descarga, en el mismo dominio que la API. */
  downloadUrl: string;
}>;

/** Última versión publicada de la app, o `null` si el servidor no la conoce. */
export async function getLatestAppVersion(
  fetcher: Fetcher = fetch,
  apiUrl = getApiUrl(),
): Promise<LatestAppVersion | null> {
  const payload = await requestJson(
    `${apiUrl}/app/latest`,
    latestVersionSchema,
    {
      errorMessage: messages().account.update.errors.check,
      fetcher,
      init: { headers: acceptJsonHeaders },
      invalidMessage: messages().account.update.errors.invalid,
    },
  );
  if (!payload.data) return null;
  return {
    version: payload.data.version,
    notes: payload.data.notes,
    downloadUrl: new URL(payload.data.downloadPath, apiUrl).toString(),
  };
}
