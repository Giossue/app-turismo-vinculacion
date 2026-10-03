import { z } from "zod";

import { getApiUrl } from "@/core/api/api-url";
import { assertResponseOk, requestJson, sendRequest } from "@/core/api/http";
import type { AuthorizedFetcher } from "@/features/auth/data/auth-api";
import { publicCenterSchema } from "@/features/centers/data/public-centers-api";
import type { PublicCenter } from "@/features/centers/domain/public-center";
import { establishmentSchema } from "@/features/establishments/data/establishments-api";
import type { SavedEstablishment } from "@/features/establishments/domain/establishment";

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

const savedEstablishmentSchema = establishmentSchema.extend({
  id: z.number().int().positive(),
  photoUrl: z.string().min(1).nullable(),
});
const establishmentListSchema = z.object({
  data: z.array(savedEstablishmentSchema),
});
const establishmentItemSchema = z.object({ data: savedEstablishmentSchema });

/** Saved registry establishments, newest first. */
export async function listRemoteSavedEstablishments(
  request: AuthorizedFetcher,
  apiUrl = getApiUrl(),
): Promise<readonly SavedEstablishment[]> {
  const payload = await requestJson(
    `${apiUrl}/favorites/establishments`,
    establishmentListSchema,
    {
      errorMessage: "No se pudieron cargar tus guardados.",
      fetcher: request,
      invalidMessage: "Los guardados no tienen el formato esperado.",
    },
  );
  return payload.data;
}

export async function saveRemoteEstablishment(
  id: number,
  request: AuthorizedFetcher,
  apiUrl = getApiUrl(),
): Promise<SavedEstablishment> {
  const payload = await requestJson(
    `${apiUrl}/favorites/establishments/${id}`,
    establishmentItemSchema,
    {
      errorMessage: "No se pudo guardar el establecimiento.",
      fetcher: request,
      init: { method: "PUT" },
      invalidMessage: "El guardado no tiene el formato esperado.",
    },
  );
  return payload.data;
}

export async function removeRemoteEstablishment(
  id: number,
  request: AuthorizedFetcher,
  apiUrl = getApiUrl(),
): Promise<void> {
  const errorMessage = "No se pudo quitar el establecimiento guardado.";
  const response = await sendRequest(
    `${apiUrl}/favorites/establishments/${id}`,
    { errorMessage, fetcher: request, init: { method: "DELETE" } },
  );
  await assertResponseOk(response, { errorMessage });
}
