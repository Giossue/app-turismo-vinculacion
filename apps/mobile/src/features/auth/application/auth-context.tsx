import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  useSyncExternalStore,
  type ReactNode,
} from "react";
import {
  onlineManager,
  useIsRestoring,
  useQueryClient,
} from "@tanstack/react-query";

import { getApiUrl } from "@/core/api/api-url";
import { retainQueryAccount } from "@/core/api/query-persistence";
import { showTourismToast } from "@/core/ui/tourism-toast";
import {
  acceptLegalDocuments,
  deleteAccount as deleteAccountRequest,
  getSessionUser,
  loginMobile,
  logoutMobile,
  registerMobile,
  refreshMobile,
  type AuthorizedFetcher,
  type LegalAcceptanceInput,
} from "../data/auth-api";
import {
  clearStoredSession,
  readStoredSession,
  saveStoredSession,
} from "../data/token-storage";
import {
  getPendingLegalDocuments,
  type AuthStatus,
  type AuthUser,
} from "../domain/auth-user";
import type { TouristRegistrationInput } from "../domain/registration-options";
import { MobileSession, type AccountSessionScope } from "./mobile-session";
import { messages } from "@/core/i18n/language";
import type { LegalDocumentType } from "@/features/legal/domain/legal-document";

/** El perfil puede estar autenticado sin access token durante el uso sin conexión. */
export type AuthContextValue = Readonly<{
  login: (email: string, password: string) => Promise<void>;
  register: (input: TouristRegistrationInput) => Promise<void>;
  logout: () => Promise<void>;
  acceptLegalDocuments: (input: LegalAcceptanceInput) => Promise<void>;
  /** Elimina la cuenta en la API y deja la sesión local como tras `logout`. */
  deleteAccount: (password: string) => Promise<void>;
  /** Único origen del bloqueo de reaceptación; vacío si no hay nada confirmado. */
  pendingLegalDocuments: readonly LegalDocumentType[];
  request: AuthorizedFetcher;
  sessionScope: AccountSessionScope | null;
  isCurrentSession: (scope: AccountSessionScope | null) => boolean;
  status: AuthStatus;
  user: AuthUser | null;
}>;

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: Readonly<{ children: ReactNode }>) {
  const queryClient = useQueryClient();
  const isRestoring = useIsRestoring();
  const [session] = useState(
    () =>
      new MobileSession({
        apiUrl: readApiUrl,
        fetcher: (input, init) => fetch(input, init),
        retainAccount: (userId) => retainQueryAccount(queryClient, userId),
        storage: {
          read: readStoredSession,
          save: saveStoredSession,
          clear: clearStoredSession,
        },
        api: {
          login: loginMobile,
          logout: logoutMobile,
          register: registerMobile,
          refresh: refreshMobile,
          acceptLegal: acceptLegalDocuments,
          deleteAccount: deleteAccountRequest,
          sessionUser: getSessionUser,
        },
      }),
  );
  const { generation, status, user } = useSyncExternalStore(
    session.subscribe,
    session.getSnapshot,
    session.getSnapshot,
  );

  useEffect(() => {
    // Primero se hidrata; después se retira cualquier cuenta ajena a la sesión.
    if (!isRestoring) return session.attach();
  }, [isRestoring, session]);

  useEffect(
    () =>
      onlineManager.subscribe((online) => {
        if (online) void session.reevaluate();
      }),
    [session],
  );

  const request = useMemo(
    () => session.requestForGeneration(generation),
    [generation, session],
  );
  const sessionScope = useMemo<AccountSessionScope | null>(
    () =>
      status === "authenticated" && user
        ? { generation, userId: user.id }
        : null,
    [generation, status, user],
  );
  const logout = useCallback(async () => {
    try {
      await session.logout();
    } catch (error) {
      // El aviso permanece aunque AuthGate ya haya retirado la pantalla privada.
      showTourismToast(messages().account.errors.localLogout, "help");
      throw error;
    }
  }, [session]);
  const deleteAccount = useCallback(
    async (password: string) => {
      const cleaned = await session.deleteAccount(password);
      if (!cleaned) showTourismToast(messages().account.errors.localLogout, "help");
    },
    [session],
  );
  const pendingLegalDocuments = getPendingLegalDocuments(status, user);
  const value = useMemo<AuthContextValue>(
    () => ({
      acceptLegalDocuments: session.acceptLegalDocuments,
      deleteAccount,
      login: session.login,
      logout,
      pendingLegalDocuments,
      register: session.register,
      request,
      sessionScope,
      isCurrentSession: session.isCurrentSession,
      status,
      user,
    }),
    [
      deleteAccount,
      logout,
      pendingLegalDocuments,
      request,
      session,
      sessionScope,
      status,
      user,
    ],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth debe usarse dentro de AuthProvider");
  }
  return context;
}

function readApiUrl(): string | null {
  try {
    return getApiUrl();
  } catch {
    return null;
  }
}
