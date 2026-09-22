import { z } from "zod";

import { getApiUrl } from "@/core/api/api-url";
import {
  assertResponseOk,
  requestJson,
  sendRequest,
  type Fetcher,
} from "@/core/api/http";
import { authUserSchema, type AuthUser } from "../domain/auth-user";
import type { TouristRegistrationInput } from "../domain/registration-options";

const authResultSchema = z.object({
  data: z.object({
    accessToken: z.string().min(1),
    refreshToken: z.string().min(1),
    user: authUserSchema,
  }),
});

type AuthResult = Readonly<{
  accessToken: string;
  refreshToken: string;
  user: AuthUser;
}>;

/** A `fetch` that adds the tourist's access token and refreshes it on 401. */
export type AuthorizedFetcher = Fetcher;

const jsonContentHeaders = { "content-type": "application/json" } as const;

export function loginMobile(
  email: string,
  password: string,
  fetcher: Fetcher = fetch,
  apiUrl = getApiUrl(),
): Promise<AuthResult> {
  return requestAuthResult(
    `${apiUrl}/auth/mobile/login`,
    { email, password },
    fetcher,
    "No se pudo iniciar sesión.",
  );
}

export function registerMobile(
  input: TouristRegistrationInput,
  fetcher: Fetcher = fetch,
  apiUrl = getApiUrl(),
): Promise<AuthResult> {
  return requestAuthResult(
    `${apiUrl}/auth/mobile/register`,
    input,
    fetcher,
    "No se pudo crear la cuenta.",
  );
}

export function refreshMobile(
  refreshToken: string,
  fetcher: Fetcher = fetch,
  apiUrl = getApiUrl(),
): Promise<AuthResult> {
  return requestAuthResult(
    `${apiUrl}/auth/mobile/refresh`,
    { refreshToken },
    fetcher,
    "La sesión expiró.",
  );
}

export async function logoutMobile(
  refreshToken: string,
  fetcher: Fetcher = fetch,
  apiUrl = getApiUrl(),
): Promise<void> {
  const errorMessage = "No se pudo cerrar la sesión remota.";
  const response = await sendRequest(`${apiUrl}/auth/mobile/logout`, {
    errorMessage,
    fetcher,
    init: {
      body: JSON.stringify({ refreshToken }),
      headers: jsonContentHeaders,
      method: "POST",
    },
  });
  await assertResponseOk(response, { errorMessage });
}

async function requestAuthResult(
  url: string,
  body: unknown,
  fetcher: Fetcher,
  errorMessage: string,
): Promise<AuthResult> {
  const payload = await requestJson(url, authResultSchema, {
    errorMessage,
    fetcher,
    init: {
      body: JSON.stringify(body),
      headers: jsonContentHeaders,
      method: "POST",
    },
    invalidMessage: "La sesión no tiene un formato válido.",
    useServerMessage: true,
  });
  return payload.data;
}
