import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { useQueryClient } from "@tanstack/react-query";

import { getApiUrl } from "@/core/api/api-url";
import { userScopedQueryKeys } from "@/core/api/query-keys";
import { clearPersistedQueryCache } from "@/core/api/query-persistence";
import {
  loginMobile,
  logoutMobile,
  registerMobile,
  refreshMobile,
  type AuthorizedFetcher,
} from "../data/auth-api";
import {
  isApiRequest,
  isRejectedSessionError,
} from "../data/authorized-request";
import {
  clearStoredSession,
  readStoredSession,
  saveStoredSession,
} from "../data/token-storage";
import type { AuthStatus, AuthUser } from "../domain/auth-user";
import type { TouristRegistrationInput } from "../domain/registration-options";

/**
 * `login` and `register` reject with the API's error; each form shows it.
 * `authenticated` may lack an access token while offline: the stored
 * session is kept and refreshed by the next authorized request.
 */
type AuthContextValue = Readonly<{
  login: (email: string, password: string) => Promise<void>;
  register: (input: TouristRegistrationInput) => Promise<void>;
  logout: () => Promise<void>;
  request: AuthorizedFetcher;
  status: AuthStatus;
  user: AuthUser | null;
}>;

type SessionResult = Readonly<{
  accessToken: string;
  refreshToken: string;
  user: AuthUser;
}>;

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: Readonly<{ children: ReactNode }>) {
  const queryClient = useQueryClient();
  const accessTokenRef = useRef<string | null>(null);
  const refreshPromiseRef = useRef<Promise<boolean> | null>(null);
  const [status, setStatus] = useState<AuthStatus>("loading");
  const [user, setUser] = useState<AuthUser | null>(null);

  const clearSession = useCallback(async () => {
    accessTokenRef.current = null;
    try {
      await clearStoredSession();
    } catch {
      // El estado en memoria se limpia aunque el almacén seguro falle.
    }
    setUser(null);
    setStatus("anonymous");
    // Nada de la cuenta anterior debe quedar visible para el siguiente
    // turista: ni en memoria ni en la copia persistida de la caché.
    for (const queryKey of userScopedQueryKeys) {
      queryClient.removeQueries({ queryKey });
    }
    await clearPersistedQueryCache();
  }, [queryClient]);

  const setSession = useCallback(async (result: SessionResult) => {
    await saveStoredSession(result.refreshToken, result.user);
    accessTokenRef.current = result.accessToken;
    setUser(result.user);
    setStatus("authenticated");
  }, []);

  const refreshSession = useCallback(async (): Promise<boolean> => {
    if (refreshPromiseRef.current) return refreshPromiseRef.current;

    const promise = (async () => {
      const stored = await readStoredSession().catch(() => null);
      if (!stored) {
        setStatus("anonymous");
        return false;
      }

      try {
        await setSession(await refreshMobile(stored.refreshToken));
        return true;
      } catch (error) {
        if (isRejectedSessionError(error)) {
          await clearSession();
          return false;
        }
        // Sin conexión o con la API caída, la sesión guardada se conserva y
        // se renueva en la siguiente solicitud autenticada.
        const offlineUser = stored.user;
        if (offlineUser) {
          setUser((current) => current ?? offlineUser);
          setStatus("authenticated");
        } else {
          setStatus((current) =>
            current === "loading" ? "anonymous" : current,
          );
        }
        return false;
      }
    })();
    refreshPromiseRef.current = promise;

    try {
      return await promise;
    } finally {
      if (refreshPromiseRef.current === promise) {
        refreshPromiseRef.current = null;
      }
    }
  }, [clearSession, setSession]);

  useEffect(() => {
    void refreshSession();
  }, [refreshSession]);

  const login = useCallback(
    async (email: string, password: string) => {
      await setSession(await loginMobile(email, password));
    },
    [setSession],
  );

  const register = useCallback(
    async (input: TouristRegistrationInput) => {
      await setSession(await registerMobile(input));
    },
    [setSession],
  );

  const logout = useCallback(async () => {
    try {
      const stored = await readStoredSession();
      if (stored) await logoutMobile(stored.refreshToken);
    } catch {
      // Cerrar sesión es de mejor esfuerzo: si la API no responde, el token
      // remoto expira solo y la sesión local se borra igualmente.
    } finally {
      await clearSession();
    }
  }, [clearSession]);

  const request = useCallback<AuthorizedFetcher>(
    async (input, init = {}) => {
      if (!isApiRequest(input, readApiUrl())) return fetch(input, init);

      const execute = (token: string | null) => {
        const headers = new Headers(init.headers);
        if (!headers.has("Accept")) headers.set("Accept", "application/json");
        if (token) headers.set("Authorization", `Bearer ${token}`);
        return fetch(input, { ...init, headers });
      };

      // A session restored offline has no access token yet.
      if (!accessTokenRef.current) await refreshSession();
      const response = await execute(accessTokenRef.current);
      if (response.status !== 401) return response;
      if (!(await refreshSession())) return response;
      return execute(accessTokenRef.current);
    },
    [refreshSession],
  );

  const value = useMemo<AuthContextValue>(
    () => ({ login, logout, register, request, status, user }),
    [login, logout, register, request, status, user],
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
