import { z } from "zod";

import { getApiUrl } from "@/core/api/api-url";
import type { AuthorizedFetcher } from "@/features/auth/data/auth-api";
import { publicCenterSchema } from "@/features/centers/data/public-centers-api";
import type { PublicCenter } from "@/features/centers/domain/public-center";

const listSchema = z.object({ data: z.array(publicCenterSchema) });
const centerSchema = z.object({ data: publicCenterSchema });

export async function listRemoteSavedCenters(
  request: AuthorizedFetcher,
  apiUrl = getApiUrl(),
): Promise<readonly PublicCenter[]> {
  const response = await request(`${apiUrl}/favorites/centers`);
  if (!response.ok) throw new Error("No se pudieron cargar tus guardados.");
  const payload = listSchema.safeParse(await response.json());
  if (!payload.success) {
    throw new Error("Los guardados no tienen el formato esperado.");
  }
  return payload.data.data;
}

export async function saveRemoteCenter(
  code: string,
  request: AuthorizedFetcher,
  apiUrl = getApiUrl(),
): Promise<PublicCenter> {
  const response = await request(
    `${apiUrl}/favorites/centers/${encodeURIComponent(code)}`,
    { method: "PUT" },
  );
  if (!response.ok) throw new Error("No se pudo guardar el lugar.");
  const payload = centerSchema.safeParse(await response.json());
  if (!payload.success) {
    throw new Error("El guardado no tiene el formato esperado.");
  }
  return payload.data.data;
}

export async function removeRemoteCenter(
  code: string,
  request: AuthorizedFetcher,
  apiUrl = getApiUrl(),
): Promise<void> {
  const response = await request(
    `${apiUrl}/favorites/centers/${encodeURIComponent(code)}`,
    { method: "DELETE" },
  );
  if (!response.ok) throw new Error("No se pudo quitar el lugar guardado.");
}
