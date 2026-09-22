import { z } from "zod";

import { getApiUrl } from "@/core/api/api-url";
import { assertResponseOk, requestJson, sendRequest } from "@/core/api/http";
import type { AuthorizedFetcher } from "@/features/auth/data/auth-api";
import { publicCenterSchema } from "@/features/centers/data/public-centers-api";
import type { PublicCenter } from "@/features/centers/domain/public-center";

const listSchema = z.object({ data: z.array(publicCenterSchema) });
const centerSchema = z.object({ data: publicCenterSchema });

export async function listRemoteSavedCenters(
  request: AuthorizedFetcher,
  apiUrl = getApiUrl(),
): Promise<readonly PublicCenter[]> {
  const payload = await requestJson(`${apiUrl}/favorites/centers`, listSchema, {
    errorMessage: "No se pudieron cargar tus guardados.",
    fetcher: request,
    invalidMessage: "Los guardados no tienen el formato esperado.",
  });
  return payload.data;
}

export async function saveRemoteCenter(
  code: string,
  request: AuthorizedFetcher,
  apiUrl = getApiUrl(),
): Promise<PublicCenter> {
  const payload = await requestJson(
    `${apiUrl}/favorites/centers/${encodeURIComponent(code)}`,
    centerSchema,
    {
      errorMessage: "No se pudo guardar el lugar.",
      fetcher: request,
      init: { method: "PUT" },
      invalidMessage: "El guardado no tiene el formato esperado.",
    },
  );
  return payload.data;
}

export async function removeRemoteCenter(
  code: string,
  request: AuthorizedFetcher,
  apiUrl = getApiUrl(),
): Promise<void> {
  const errorMessage = "No se pudo quitar el lugar guardado.";
  const response = await sendRequest(
    `${apiUrl}/favorites/centers/${encodeURIComponent(code)}`,
    { errorMessage, fetcher: request, init: { method: "DELETE" } },
  );
  await assertResponseOk(response, { errorMessage });
}
