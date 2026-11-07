import { z } from "zod";

import { getApiUrl } from "@/core/api/api-url";
import {
  acceptJsonHeaders,
  assertResponseOk,
  requestJson,
  sendRequest,
  type Fetcher,
} from "@/core/api/http";
import { authUserSchema, type AuthUser } from "../domain/auth-user";
import type { TouristRegistrationInput } from "../domain/registration-options";
import { messages } from "@/core/i18n/language";
import type { LegalConsent } from "@/features/legal/domain/legal-consent";
import {
  legalDocumentTypes,
  type LegalDocumentType,
} from "@/features/legal/domain/legal-document";
import { requestCodedJson } from "./coded-api-error";

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

const sessionUserSchema = z.object({ data: z.object({ user: authUserSchema }) });

const legalAcceptanceSchema = z.object({
  data: z.object({
    pendingLegalDocuments: z.array(z.enum(legalDocumentTypes)),
  }),
});

const accountDeletionSchema = z.object({
  data: z.object({ deleted: z.literal(true) }),
});

export type LegalAcceptanceInput = Readonly<{
  acceptedLegal: LegalConsent;
  appVersion?: string;
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
  const errors = messages().account.errors;
  return requestAuthResult(
    `${apiUrl}/auth/mobile/register`,
    input,
    fetcher,
    errors.register,
    { 400: errors.invalidData },
    {
      LEGAL_VERSION_OUTDATED: errors.legalVersionOutdated,
      UNDERAGE: errors.underage,
    },
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
    init: jsonPost({ refreshToken }),
  });
  await assertResponseOk(response, { errorMessage });
}

/** Perfil vigente, sin rotar el refresh token como hace una renovación. */
export async function getSessionUser(
  request: AuthorizedFetcher,
  apiUrl = getApiUrl(),
): Promise<AuthUser> {
  const errorMessage = messages().account.errors.invalidSession;
  const payload = await requestJson(`${apiUrl}/auth/me`, sessionUserSchema, {
    errorMessage,
    fetcher: request,
    init: { headers: acceptJsonHeaders },
    invalidMessage: errorMessage,
  });
  return payload.data.user;
}

/** Registra la aceptación y devuelve lo que sigue pendiente para la cuenta. */
export async function acceptLegalDocuments(
  input: LegalAcceptanceInput,
  request: AuthorizedFetcher,
  apiUrl = getApiUrl(),
): Promise<readonly LegalDocumentType[]> {
  const errors = messages().account.errors;
  const payload = await requestCodedJson(
    `${apiUrl}/auth/legal-acceptances`,
    legalAcceptanceSchema,
    {
      codeMessages: { LEGAL_VERSION_OUTDATED: errors.legalVersionOutdated },
      errorMessage: errors.legalAcceptance,
      fetcher: request,
      init: jsonPost(input),
      invalidMessage: errors.legalAcceptance,
    },
  );
  return payload.data.pendingLegalDocuments;
}

export async function deleteAccount(
  password: string,
  request: AuthorizedFetcher,
  apiUrl = getApiUrl(),
): Promise<void> {
  const errors = messages().account.errors;
  await requestCodedJson(
    `${apiUrl}/auth/account/delete`,
    accountDeletionSchema,
    {
      codeMessages: {
        ACCOUNT_NOT_DELETABLE: errors.accountNotDeletable,
        INVALID_PASSWORD: errors.invalidDeletePassword,
      },
      errorMessage: errors.deleteAccount,
      fetcher: request,
      init: jsonPost({ password }),
      invalidMessage: errors.deleteAccount,
    },
  );
}

function jsonPost(body: unknown): RequestInit {
  return {
    body: JSON.stringify(body),
    headers: jsonContentHeaders,
    method: "POST",
  };
}

async function requestAuthResult(
  url: string,
  body: unknown,
  fetcher: Fetcher,
  errorMessage: string,
  serverMessageFallbacks: Readonly<Partial<Record<number, string>>>,
  codeMessages?: Readonly<Record<string, string>>,
): Promise<AuthResult> {
  const options = {
    errorMessage,
    fetcher,
    init: jsonPost(body),
    invalidMessage: messages().account.errors.invalidSession,
    serverMessageFallbacks,
    useServerMessage: true,
  };
  const payload = await (codeMessages
    ? requestCodedJson(url, authResultSchema, { ...options, codeMessages })
    : requestJson(url, authResultSchema, options));
  return payload.data;
}
