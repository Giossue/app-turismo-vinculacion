import { vi } from "vitest";

import {
  acceptLegalDocuments,
  deleteAccount,
  getSessionUser,
  loginMobile,
  logoutMobile,
  refreshMobile,
  registerMobile,
} from "../data/auth-api";
import type { StoredSession } from "../data/stored-user";
import { MobileSession } from "./mobile-session";

export const apiUrl = "https://api.test/api/v1";
export const userA = { id: 7, name: "Ana", email: "ana@test.com", roles: ["TURISTA"] };
export const userB = { id: 8, name: "Bea", email: "bea@test.com", roles: ["TURISTA"] };
export const resultA = {
  accessToken: "access-a",
  refreshToken: "refresh-a",
  user: userA,
};
export const resultB = {
  accessToken: "access-b",
  refreshToken: "refresh-b",
  user: userB,
};

export function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((complete) => {
    resolve = complete;
  });
  return { promise, resolve };
}
export const response = (data: unknown, status = 200) =>
  Response.json({ data }, { status });

export function harness(initial: StoredSession | null = null) {
  let stored = initial;
  const fetcher = vi.fn(
    async (_input: RequestInfo | URL, _init?: RequestInit) => response(resultA),
  );
  const storage = {
    read: vi.fn(async () => stored),
    save: vi.fn(async (refreshToken: string, user: typeof userA) => {
      stored = { refreshToken, user };
    }),
    clear: vi.fn(async () => {
      stored = null;
    }),
  };
  const retainAccount = vi.fn(async (_id: number | null) => undefined);
  const clearAccountDeviceData = vi.fn(async (_id: number) => undefined);
  const session = new MobileSession({
    apiUrl: () => apiUrl,
    fetcher,
    retainAccount,
    clearAccountDeviceData,
    storage,
    api: {
      login: (email, password, request) =>
        loginMobile(email, password, request, apiUrl),
      register: (input, request) => registerMobile(input, request, apiUrl),
      refresh: (token, request) => refreshMobile(token, request, apiUrl),
      logout: (token, request) => logoutMobile(token, request, apiUrl),
      acceptLegal: (input, request) =>
        acceptLegalDocuments(input, request, apiUrl),
      deleteAccount: (password, request) =>
        deleteAccount(password, request, apiUrl),
      sessionUser: (request) => getSessionUser(request, apiUrl),
    },
  });
  return {
    session,
    fetcher,
    storage,
    retainAccount,
    clearAccountDeviceData,
    stored: () => stored,
    request: () =>
      session.requestForGeneration(session.getSnapshot().generation),
    scope: () => ({
      generation: session.getSnapshot().generation,
      userId: session.getSnapshot().user!.id,
    }),
  };
}
