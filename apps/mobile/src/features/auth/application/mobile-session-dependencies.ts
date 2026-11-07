import type { Fetcher } from "@/core/api/http";
import type { LegalDocumentType } from "@/features/legal/domain/legal-document";
import type { AuthorizedFetcher, LegalAcceptanceInput } from "../data/auth-api";
import type { StoredSession } from "../data/stored-user";
import type { AuthUser } from "../domain/auth-user";
import type { TouristRegistrationInput } from "../domain/registration-options";

export type SessionResult = Readonly<{
  accessToken: string;
  refreshToken: string;
  user: AuthUser;
}>;

/** Transporte, disco y API que `MobileSession` recibe para poder probarse. */
export type SessionDependencies = Readonly<{
  apiUrl: () => string | null;
  fetcher: Fetcher;
  retainAccount: (userId: number | null) => Promise<void>;
  /** Borra del dispositivo lo que la cuenta eliminada dejó fuera de la caché. */
  clearAccountDeviceData: (userId: number) => Promise<void>;
  storage: Readonly<{
    read: () => Promise<StoredSession | null>;
    save: (refreshToken: string, user: AuthUser) => Promise<void>;
    clear: () => Promise<void>;
  }>;
  api: Readonly<{
    login: (
      email: string,
      password: string,
      request: Fetcher,
    ) => Promise<SessionResult>;
    register: (
      input: TouristRegistrationInput,
      request: Fetcher,
    ) => Promise<SessionResult>;
    refresh: (refreshToken: string, request: Fetcher) => Promise<SessionResult>;
    logout: (refreshToken: string, request: Fetcher) => Promise<void>;
    acceptLegal: (
      input: LegalAcceptanceInput,
      request: AuthorizedFetcher,
    ) => Promise<readonly LegalDocumentType[]>;
    deleteAccount: (
      password: string,
      request: AuthorizedFetcher,
    ) => Promise<void>;
    sessionUser: (request: AuthorizedFetcher) => Promise<AuthUser>;
  }>;
}>;
