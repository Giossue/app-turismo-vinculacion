import type { Fetcher } from "@/core/api/http";
import { createSerialTaskQueue } from "@/core/storage/serial-task-queue";
import type { AuthorizedFetcher, LegalAcceptanceInput } from "../data/auth-api";
import {
  isApiRequest,
  isRejectedSessionError,
} from "../data/authorized-request";
import type { AuthStatus, AuthUser } from "../domain/auth-user";
import {
  shouldRefreshBeforeRequest,
  shouldRetryAfterUnauthorized,
} from "../domain/authorized-request-policy";
import type { TouristRegistrationInput } from "../domain/registration-options";
import { messages } from "@/core/i18n/language";
import type { LegalDocumentType } from "@/features/legal/domain/legal-document";
import type {
  SessionDependencies,
  SessionResult,
} from "./mobile-session-dependencies";

export type { SessionResult };
export type AccountSessionScope = Readonly<{
  generation: number;
  userId: number;
}>;
export type AccountSessionAccess = Readonly<{
  request: AuthorizedFetcher;
  sessionScope: AccountSessionScope | null;
  isCurrentSession: (scope: AccountSessionScope | null) => boolean;
}>;
type SessionSnapshot = Readonly<{
  generation: number;
  status: AuthStatus;
  user: AuthUser | null;
}>;
export function sessionCancelledError(): Error {
  const error = new Error(messages().account.errors.sessionInactive);
  error.name = "AbortError";
  return error;
}

/** Coordina identidad, transporte y disco sin depender del ciclo de renderizado. */
export class MobileSession {
  private snapshot: SessionSnapshot = {
    generation: 0,
    status: "loading",
    user: null,
  };
  private accessToken: string | null = null;
  private knownAnonymous = false;
  private refreshPromise: Promise<boolean> | null = null;
  private deletionPromise: Promise<boolean> | null = null;
  private readonly controllers = new Set<AbortController>();
  private readonly listeners = new Set<() => void>();
  private readonly storageQueue = createSerialTaskQueue();
  private leases = 0;

  constructor(private readonly dependencies: SessionDependencies) {}

  readonly getSnapshot = () => this.snapshot;
  readonly subscribe = (listener: () => void) => {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  };
  readonly isCurrentSession = (scope: AccountSessionScope | null): boolean =>
    scope !== null &&
    this.snapshot.status === "authenticated" &&
    scope.generation === this.snapshot.generation &&
    scope.userId === this.snapshot.user?.id;

  /** Strict Mode puede reconectar en el mismo turno sin duplicar la renovación. */
  readonly attach = () => {
    this.leases++;
    void this.refresh();
    return () => {
      this.leases--;
      queueMicrotask(() => {
        if (this.leases !== 0) return;
        this.advanceGeneration();
        this.knownAnonymous = false;
        this.publish("loading", null);
      });
    };
  };

  readonly login = async (email: string, password: string): Promise<void> => {
    const { generation, cleanup } = this.replaceSession();
    await cleanup;
    this.assertGeneration(generation);
    const result = await this.dependencies.api.login(
      email,
      password,
      this.fetchForGeneration(generation),
    );
    await this.commit(result, generation);
  };

  readonly register = async (
    input: TouristRegistrationInput,
  ): Promise<void> => {
    const { generation, cleanup } = this.replaceSession();
    await cleanup;
    this.assertGeneration(generation);
    const result = await this.dependencies.api.register(
      input,
      this.fetchForGeneration(generation),
    );
    await this.commit(result, generation);
  };

  readonly logout = async (): Promise<void> => {
    // Esta lectura queda antes del borrado y nunca lee el token de la cuenta nueva.
    const stored = this.storageQueue.run(this.dependencies.storage.read);
    const { cleanup } = this.replaceSession();
    void stored
      .then((session) =>
        session
          ? this.dependencies.api.logout(
              session.refreshToken,
              this.dependencies.fetcher,
            )
          : undefined,
      )
      .catch(() => undefined);
    await cleanup;
  };

  readonly refresh = (): Promise<boolean> => {
    if (this.knownAnonymous) return Promise.resolve(false);
    if (this.refreshPromise) return this.refreshPromise;
    const generation = this.snapshot.generation;
    const promise = this.refreshCurrent(generation)
      .catch(async () => {
        if (generation === this.snapshot.generation) {
          await this.replaceSession().cleanup.catch(() => undefined);
        }
        return false;
      })
      .finally(() => {
        if (this.refreshPromise === promise) this.refreshPromise = null;
      });
    this.refreshPromise = promise;
    return promise;
  };

  /**
   * Vuelve a preguntar por los documentos pendientes al recuperar la conexión.
   * Con access token consulta el perfil: renovar rotaría el refresh token en
   * cada corte de red, justo cuando una respuesta perdida revocaría la sesión.
   */
  readonly reevaluate = async (): Promise<void> => {
    if (this.snapshot.status !== "authenticated") return;
    if (this.accessToken === null) {
      await this.refresh();
      return;
    }
    const generation = this.snapshot.generation;
    try {
      const user = await this.dependencies.api.sessionUser(
        this.requestForGeneration(generation),
      );
      await this.applyPendingLegalDocuments(
        user.pendingLegalDocuments,
        generation,
      );
    } catch {
      // Sin respuesta útil sigue valiendo el último estado conocido.
    }
  };

  readonly acceptLegalDocuments = async (
    input: LegalAcceptanceInput,
  ): Promise<void> => {
    const generation = this.snapshot.generation;
    const pending = await this.dependencies.api.acceptLegal(
      input,
      this.requestForGeneration(generation),
    );
    await this.applyPendingLegalDocuments(pending, generation);
  };

  /**
   * Resuelve `false` si la cuenta se eliminó pero el dispositivo no pudo borrar
   * la sesión. Una segunda confirmación comparte la solicitud en curso.
   */
  readonly deleteAccount = (password: string): Promise<boolean> => {
    if (this.deletionPromise) return this.deletionPromise;
    const promise = this.deleteCurrentAccount(password).finally(() => {
      if (this.deletionPromise === promise) this.deletionPromise = null;
    });
    this.deletionPromise = promise;
    return promise;
  };

  requestForGeneration(generation: number): AuthorizedFetcher {
    return async (input, init = {}) => {
      if (!isApiRequest(input, this.dependencies.apiUrl())) {
        return this.dependencies.fetcher(input, init);
      }
      this.assertGeneration(generation);
      const callerSignal =
        init.signal ?? (input instanceof Request ? input.signal : undefined);
      if (callerSignal?.aborted) throw sessionCancelledError();
      if (
        shouldRefreshBeforeRequest({
          hasAccessToken: this.accessToken !== null,
          knownAnonymous: this.knownAnonymous,
        })
      ) {
        await this.refresh();
      }
      this.assertGeneration(generation);
      const execute = (token: string | null) => {
        const headers = new Headers(
          input instanceof Request ? input.headers : undefined,
        );
        new Headers(init.headers).forEach((value, key) =>
          headers.set(key, value),
        );
        if (!headers.has("Accept")) headers.set("Accept", "application/json");
        headers.delete("Authorization");
        if (token) headers.set("Authorization", `Bearer ${token}`);
        return this.fetchForGeneration(generation)(input, { ...init, headers });
      };
      const sentToken = this.accessToken;
      const response = await execute(sentToken);
      if (
        response.status !== 401 ||
        !shouldRetryAfterUnauthorized({ sentAccessToken: sentToken !== null })
      ) {
        return response;
      }
      // Otra solicitud puede haber renovado mientras esta esperaba su 401.
      if (this.accessToken === sentToken && !(await this.refresh())) {
        this.assertGeneration(generation);
        return response;
      }
      this.assertGeneration(generation);
      return execute(this.accessToken);
    };
  }

  private async deleteCurrentAccount(password: string): Promise<boolean> {
    const generation = this.snapshot.generation;
    const userId = this.snapshot.user?.id;
    await this.dependencies.api.deleteAccount(
      password,
      this.requestForGeneration(generation),
    );
    this.assertGeneration(generation);
    // La API ya revocó las sesiones: queda la limpieza local de `logout` y
    // lo que esa cuenta guardó en el dispositivo fuera de la caché.
    return Promise.all([
      this.replaceSession().cleanup,
      userId === undefined
        ? undefined
        : this.dependencies.clearAccountDeviceData(userId),
    ]).then(
      () => true,
      () => false,
    );
  }

  private async applyPendingLegalDocuments(
    pendingLegalDocuments: readonly LegalDocumentType[] | undefined,
    generation: number,
  ): Promise<void> {
    this.assertGeneration(generation);
    const { status, user } = this.snapshot;
    if (status !== "authenticated" || !user) return;
    const updated: AuthUser = {
      ...user,
      pendingLegalDocuments: pendingLegalDocuments && [
        ...pendingLegalDocuments,
      ],
    };
    this.publish(status, updated);
    // Escribir el perfil solo acelera el próximo arranque sin conexión: la API
    // ya tiene el dato, así que un fallo aquí no debe cerrar la sesión.
    await this.storageQueue
      .run(async () => {
        this.assertGeneration(generation);
        const stored = await this.dependencies.storage.read();
        this.assertGeneration(generation);
        if (stored) {
          await this.dependencies.storage.save(stored.refreshToken, updated);
        }
      })
      .catch(() => undefined);
  }

  private async refreshCurrent(generation: number): Promise<boolean> {
    const stored = await this.storageQueue.run(this.dependencies.storage.read);
    this.assertGeneration(generation);
    if (!stored) {
      await this.replaceSession().cleanup;
      return false;
    }
    let result: SessionResult;
    try {
      result = await this.dependencies.api.refresh(
        stored.refreshToken,
        this.fetchForGeneration(generation),
      );
    } catch (error) {
      this.assertGeneration(generation);
      if (isRejectedSessionError(error)) {
        await this.replaceSession().cleanup;
      } else if (this.snapshot.user ?? stored.user) {
        const offlineUser = this.snapshot.user ?? stored.user!;
        if (this.snapshot.user?.id !== offlineUser.id) {
          await this.dependencies.retainAccount(offlineUser.id);
        }
        this.assertGeneration(generation);
        this.publish("authenticated", offlineUser);
      } else {
        this.accessToken = null;
        await this.dependencies.retainAccount(null);
        this.assertGeneration(generation);
        this.publish("anonymous", null);
      }
      return false;
    }
    this.assertGeneration(generation);
    const previousUser = this.snapshot.user ?? stored.user;
    if (previousUser && !sameIdentity(previousUser, result.user)) {
      const replacement = this.replaceSession();
      await replacement.cleanup;
      await this.commit(result, replacement.generation);
    } else {
      await this.commit(result, generation);
    }
    return true;
  }

  private async commit(
    result: SessionResult,
    generation: number,
  ): Promise<void> {
    await this.storageQueue.run(async () => {
      this.assertGeneration(generation);
      try {
        await this.dependencies.storage.save(result.refreshToken, result.user);
      } catch (error) {
        await this.dependencies.storage.clear().catch(() => undefined);
        throw error;
      }
      this.assertGeneration(generation);
    });
    this.assertGeneration(generation);
    if (this.snapshot.user?.id !== result.user.id) {
      await this.dependencies.retainAccount(result.user.id);
      this.assertGeneration(generation);
    }
    this.accessToken = result.accessToken;
    this.knownAnonymous = false;
    this.publish("authenticated", result.user);
  }

  private replaceSession() {
    this.advanceGeneration();
    this.knownAnonymous = true;
    this.publish("anonymous", null);
    const cache = this.dependencies.retainAccount(null);
    const storage = this.storageQueue.run(this.dependencies.storage.clear);
    return {
      generation: this.snapshot.generation,
      cleanup: Promise.all([cache, storage]).then(() => undefined),
    };
  }

  private advanceGeneration(): void {
    this.snapshot = {
      ...this.snapshot,
      generation: this.snapshot.generation + 1,
    };
    this.accessToken = null;
    this.refreshPromise = null;
    this.controllers.forEach((controller) => controller.abort());
    this.controllers.clear();
  }

  private publish(status: AuthStatus, user: AuthUser | null): void {
    this.snapshot = { ...this.snapshot, status, user };
    this.listeners.forEach((listener) => listener());
  }

  private assertGeneration(generation: number): void {
    if (generation !== this.snapshot.generation) throw sessionCancelledError();
  }

  private fetchForGeneration(generation: number): Fetcher {
    return async (input, init = {}) => {
      this.assertGeneration(generation);
      const controller = new AbortController();
      const signal =
        init.signal ?? (input instanceof Request ? input.signal : undefined);
      const cancel = () => controller.abort();
      if (signal?.aborted) throw sessionCancelledError();
      signal?.addEventListener("abort", cancel, { once: true });
      this.controllers.add(controller);
      try {
        const response = await this.dependencies.fetcher(input, {
          ...init,
          signal: controller.signal,
        });
        this.assertGeneration(generation);
        if (controller.signal.aborted) throw sessionCancelledError();
        return response;
      } catch (error) {
        this.assertGeneration(generation);
        if (controller.signal.aborted) throw sessionCancelledError();
        throw error;
      } finally {
        signal?.removeEventListener("abort", cancel);
        this.controllers.delete(controller);
      }
    };
  }
}

function sameIdentity(first: AuthUser, second: AuthUser): boolean {
  return (
    first.id === second.id &&
    [...first.roles].sort().join("\0") === [...second.roles].sort().join("\0")
  );
}
