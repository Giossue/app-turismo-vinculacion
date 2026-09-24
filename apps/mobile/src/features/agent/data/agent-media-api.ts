import { z } from "zod";

import { getApiUrl } from "@/core/api/api-url";
import { requestJson } from "@/core/api/http";
import type { AuthorizedFetcher } from "@/features/auth/data/auth-api";
import { agentResponseSchema } from "../domain/agent";

type Upload = Readonly<{ uri: string; mimeType: string; name: string }>;

function fileForm(upload: Upload): FormData {
  const form = new FormData();
  form.append("file", {
    uri: upload.uri,
    name: upload.name,
    type: upload.mimeType,
  } as unknown as Blob);
  return form;
}

export async function transcribeAgentAudio(
  upload: Upload,
  request: AuthorizedFetcher,
  signal?: AbortSignal,
): Promise<string> {
  const payload = await requestJson(
    `${getApiUrl()}/ai/media/transcribe`,
    z.object({ data: z.object({ text: z.string().trim().min(1).max(2_000) }) }),
    {
      fetcher: request,
      errorMessage: "No se pudo transcribir el audio.",
      invalidMessage: "La transcripción no tiene el formato esperado.",
      init: { method: "POST", body: fileForm(upload), signal },
    },
  );
  return payload.data.text;
}

export async function analyzeAgentPhoto(
  upload: Upload,
  request: AuthorizedFetcher,
  signal?: AbortSignal,
) {
  const payload = await requestJson(
    `${getApiUrl()}/ai/media/photo`,
    z.object({ data: agentResponseSchema }),
    {
      fetcher: request,
      errorMessage: "No se pudo analizar la foto.",
      invalidMessage: "El análisis de la foto no tiene el formato esperado.",
      init: { method: "POST", body: fileForm(upload), signal },
    },
  );
  return payload.data;
}
