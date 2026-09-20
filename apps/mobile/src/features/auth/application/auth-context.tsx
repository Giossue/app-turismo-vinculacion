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

import {
  loginMobile,
  logoutMobile,
  refreshMobile,
  type AuthorizedFetcher,
} from "../data/auth-api";
import {
  clearRefreshToken,
  readRefreshToken,
  saveRefreshToken,
} from "../data/token-storage";
import type { AuthStatus, AuthUser } from "../domain/auth-user";

type AuthContextValue = Readonly<{
  error: string | null;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  request: AuthorizedFetcher;
  status: AuthStatus;
  user: AuthUser | null;
}>;

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: Readonly<{ children: ReactNode }>) {
  const queryClient = useQueryClient();
  const accessTokenRef = useRef<string | null>(null);
  const refreshPromiseRef = useRef<Promise<boolean> | null>(null);
  const [status, setStatus] = useState<AuthStatus>("loading");
  const [user, setUser] = useState<AuthUser | null>(null);
  const [error, setError] = useState<string | null>(null);

  const clearSession = useCallback(async () => {
    accessTokenRef.current = null;
    await clearRefreshToken();
    setUser(null);
    setStatus("anonymous");
    setError(null);
    queryClient.removeQueries({ queryKey: ["saved-centers"] });
  }, [queryClient]);

  const setSession = useCallback(
    async (result: {
      accessToken: string;
      refreshToken: string;
      user: AuthUser;
    }) => {
      await saveRefreshToken(result.refreshToken);
      accessTokenRef.current = result.accessToken;
      setUser(result.user);
      setStatus("authenticated");
      setError(null);
    },
    [],
  );

  const refreshSession = useCallback(async (): Promise<boolean> => {
    if (refreshPromiseRef.current) return refreshPromiseRef.current;

    const promise = (async () => {
      const storedToken = await readRefreshToken();
      if (!storedToken) {
        setStatus("anonymous");
        return false;
      }

      try {
        const result = await refreshMobile(storedToken);
        await setSession(result);
        return true;
      } catch {
        await clearSession();
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
      setError(null);
      try {
        const result = await loginMobile(email.trim(), password);
        await setSession(result);
      } catch (cause) {
        const message =
          cause instanceof Error ? cause.message : "No se pudo iniciar sesión.";
        setError(message);
        throw cause;
      }
    },
    [setSession],
  );

  const logout = useCallback(async () => {
    const storedToken = await readRefreshToken();
    try {
      if (storedToken) await logoutMobile(storedToken);
    } finally {
      await clearSession();
    }
  }, [clearSession]);

  const request = useCallback<AuthorizedFetcher>(
    async (input, init = {}) => {
      const execute = (token: string | null) => {
        const headers = new Headers(init.headers);
        headers.set("Accept", "application/json");
        if (token) headers.set("Authorization", `Bearer ${token}`);
        return fetch(input, { ...init, headers });
      };

      const response = await execute(accessTokenRef.current);
      if (response.status !== 401) return response;
      if (!(await refreshSession())) return response;
      return execute(accessTokenRef.current);
    },
    [refreshSession],
  );

  const value = useMemo<AuthContextValue>(
    () => ({ error, login, logout, request, status, user }),
    [error, login, logout, request, status, user],
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
