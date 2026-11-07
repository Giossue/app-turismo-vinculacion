import { z } from "zod";

import { getApiUrl } from "@/core/api/api-url";
import { acceptJsonHeaders, requestJson, type Fetcher } from "@/core/api/http";
import { messages } from "@/core/i18n/language";
import {
  legalDocumentSchema,
  legalDocumentTypes,
  type LegalDocument,
} from "../domain/legal-document";

const legalDocumentsSchema = z.object({
  data: z
    .array(legalDocumentSchema)
    .refine((documents) =>
      legalDocumentTypes.every((type) =>
        documents.some((document) => document.type === type),
      ),
    ),
});

/** Documentos vigentes; son públicos porque se leen antes de tener cuenta. */
export async function getLegalDocuments(
  fetcher: Fetcher = fetch,
  apiUrl = getApiUrl(),
): Promise<readonly LegalDocument[]> {
  const errorMessage = messages().account.legal.loadError;
  const payload = await requestJson(
    `${apiUrl}/legal/documents`,
    legalDocumentsSchema,
    {
      errorMessage,
      fetcher,
      init: { headers: acceptJsonHeaders },
      invalidMessage: errorMessage,
    },
  );
  return payload.data;
}
