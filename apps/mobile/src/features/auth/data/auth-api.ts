import { z } from "zod";

import { getApiUrl } from "@/core/api/api-url";
import type { AuthUser } from "../domain/auth-user";

const authResultSchema = z.object({
  data: z.object({
    accessToken: z.string().min(1),
    refreshToken: z.string().min(1),
    user: z.object({
      id: z.number().int().positive(),
      name: z.string().min(1),
      email: z.string().email(),
      roles: z.array(z.string()),
    }),
  }),
});

type AuthResult = Readonly<{
  accessToken: string;
  refreshToken: string;
  user: AuthUser;
}>;

export type AuthorizedFetcher = (
  input: RequestInfo | URL,
  init?: RequestInit,
) => Promise<Response>;

export async function loginMobile(
  email: string,
  password: string,
  fetcher: typeof fetch = fetch,
  apiUrl = getApiUrl(),
): Promise<AuthResult> {
  const response = await fetcher(`${apiUrl}/auth/mobile/login`, {
    body: JSON.stringify({ email, password }),
    headers: { "content-type": "application/json" },
    method: "POST",
  });
  return parseAuthResult(response, "No se pudo iniciar sesión.");
}

export async function refreshMobile(
  refreshToken: string,
  fetcher: typeof fetch = fetch,
  apiUrl = getApiUrl(),
): Promise<AuthResult> {
  const response = await fetcher(`${apiUrl}/auth/mobile/refresh`, {
    body: JSON.stringify({ refreshToken }),
    headers: { "content-type": "application/json" },
    method: "POST",
  });
  return parseAuthResult(response, "La sesión expiró.");
}

export async function logoutMobile(
  refreshToken: string,
  fetcher: typeof fetch = fetch,
  apiUrl = getApiUrl(),
): Promise<void> {
  const response = await fetcher(`${apiUrl}/auth/mobile/logout`, {
    body: JSON.stringify({ refreshToken }),
    headers: { "content-type": "application/json" },
    method: "POST",
  });
  if (!response.ok) {
    throw new Error("No se pudo cerrar la sesión remota.");
  }
}

async function parseAuthResult(
  response: Response,
  fallbackMessage: string,
): Promise<AuthResult> {
  if (!response.ok) {
    throw new Error(await readErrorMessage(response, fallbackMessage));
  }
  const payload = authResultSchema.safeParse(await response.json());
  if (!payload.success) {
    throw new Error("La sesión no tiene un formato válido.");
  }
  return payload.data.data;
}

async function readErrorMessage(
  response: Response,
  fallbackMessage: string,
): Promise<string> {
  try {
    const payload: unknown = await response.json();
    if (
      payload &&
      typeof payload === "object" &&
      "error" in payload &&
      payload.error &&
      typeof payload.error === "object" &&
      "message" in payload.error &&
      typeof payload.error.message === "string"
    ) {
      return payload.error.message;
    }
  } catch {
    // Mantener un mensaje genérico si la respuesta no es JSON.
  }
  return fallbackMessage;
}
