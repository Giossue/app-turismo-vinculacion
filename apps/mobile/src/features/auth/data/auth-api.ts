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
import { messages } from "@/core/i18n/language";

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
    messages().account.errors.login,
    {
      400: messages().account.errors.invalidData,
      401: messages().account.errors.invalidCredentials,
    },
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
    messages().account.errors.register,
    { 400: messages().account.errors.invalidData },
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
    messages().account.errors.expired,
    { 401: messages().account.errors.expired },
  );
}

export async function logoutMobile(
  refreshToken: string,
  fetcher: Fetcher = fetch,
  apiUrl = getApiUrl(),
): Promise<void> {
  const errorMessage = messages().account.errors.logoutRemote;
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
  serverMessageFallbacks: Readonly<Partial<Record<number, string>>>,
): Promise<AuthResult> {
  const payload = await requestJson(url, authResultSchema, {
    errorMessage,
    fetcher,
    init: {
      body: JSON.stringify(body),
      headers: jsonContentHeaders,
      method: "POST",
    },
    invalidMessage: messages().account.errors.invalidSession,
    serverMessageFallbacks,
    useServerMessage: true,
  });
  return payload.data;
}
