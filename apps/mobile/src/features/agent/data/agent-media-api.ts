import { File } from "expo-file-system";
import { z } from "zod";

import { getApiUrl } from "@/core/api/api-url";
import { requestJson } from "@/core/api/http";
import type { AuthorizedFetcher } from "@/features/auth/data/auth-api";

type Upload = Readonly<{ uri: string; mimeType: string; name: string }>;

/**
 * Expo's `fetch` rejects React Native's `{ uri, name, type }` parts
 * ("Unsupported FormDataPart implementation"); it reads any part that
 * exposes `bytes()`, so the recording is attached that way.
 */
function fileForm(upload: Upload): FormData {
  const file = new File(upload.uri);
  const form = new FormData();
  form.append("file", {
    name: upload.name,
    type: upload.mimeType,
    bytes: () => file.bytes(),
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
      useServerMessage: true,
      invalidMessage: "La transcripción no tiene el formato esperado.",
      init: { method: "POST", body: fileForm(upload), signal },
    },
  );
  return payload.data.text;
}
