import { z } from "zod";

export type Fetcher = (
  input: RequestInfo | URL,
  init?: RequestInit,
) => Promise<Response>;

// Los adaptadores conservan su señal para que el plazo total escuche también
// la cancelación del caller sin sustituir la señal que aborta el transporte.
const requestSignals = new WeakMap<Fetcher, readonly AbortSignal[]>();

/** Propaga la cancelación de una consulta hasta su transporte HTTP. */
export function withRequestSignal(
  request: Fetcher,
  signal: AbortSignal,
): Fetcher {
  const scoped: Fetcher = (input, init) =>
    request(input, { ...init, signal: init?.signal ?? signal });
  requestSignals.set(scoped, [...(requestSignals.get(request) ?? []), signal]);
  return scoped;
}

/** Optional transport overrides shared by the feature API clients. */
export type ApiRequestOptions = Readonly<{
  apiUrl?: string;
  fetcher?: Fetcher;
  signal?: AbortSignal;
}>;

export const acceptJsonHeaders = { Accept: "application/json" } as const;

/**
 * Error with a Spanish message that is safe to show in the UI. `status` is
 * `undefined` when the request never produced an HTTP response.
 */
export class ApiError extends Error {
  readonly status?: number;

  constructor(
    message: string,
    options: Readonly<{ cause?: unknown; status?: number }> = {},
  ) {
    super(message, { cause: options.cause });
    this.name = "ApiError";
    this.status = options.status;
  }
}

/** True when the API could not be reached or failed on its side (5xx). */
export function isApiUnavailableError(error: unknown): boolean {
  return (
    error instanceof ApiError &&
    (error.status === undefined || error.status >= 500)
  );
}

type ResponseErrorOptions = Readonly<{
  /** Message for failed requests without a more specific one. */
  errorMessage: string;
  /** Specific messages for known HTTP statuses. */
  statusMessages?: Readonly<Partial<Record<number, string>>>;
  /** Prefer the API's `{ error: { message } }` body over `errorMessage`. */
  useServerMessage?: boolean;
}>;

export type SendRequestOptions = Readonly<{
  errorMessage: string;
  fetcher?: Fetcher;
  init?: RequestInit;
  /** Plazo total; cero se reserva para un transporte ya acotado por su caller. */
  timeoutMs?: number;
}>;

export type RequestJsonOptions = SendRequestOptions &
  ResponseErrorOptions &
  Readonly<{
    /** Message for bodies that are not JSON or do not match the schema. */
    invalidMessage: string;
  }>;

const apiErrorBodySchema = z.object({
  error: z.object({ message: z.string().trim().min(1) }),
});

/** Reads the API's `{ error: { message } }` body, or returns `fallback`. */
export async function readApiErrorMessage(
  response: Response,
  fallback: string,
): Promise<string> {
  try {
    const payload = apiErrorBodySchema.safeParse(await response.json());
    return payload.success ? payload.data.error.message : fallback;
  } catch {
    // Mantener un mensaje genérico si la respuesta no es JSON.
    return fallback;
  }
}

/**
 * Performs the request and turns transport failures (offline, DNS, TLS) into
 * an `ApiError` with `errorMessage`, so technical text never reaches the UI.
 * Cancellations are rethrown untouched for TanStack Query.
 */
export async function sendRequest(
  url: string,
  options: SendRequestOptions,
): Promise<Response> {
  const { errorMessage, fetcher = fetch } = options;
  try {
    return await withTransportDeadline(options, (init) =>
      init === undefined ? fetcher(url) : fetcher(url, init),
    );
  } catch (error) {
    if (isAbortError(error) || error instanceof ApiError) throw error;
    throw new ApiError(errorMessage, { cause: error });
  }
}

/** Throws an `ApiError` with a user-facing message for non-2xx responses. */
export async function assertResponseOk(
  response: Response,
  {
    errorMessage,
    statusMessages,
    useServerMessage = false,
  }: ResponseErrorOptions,
): Promise<void> {
  if (response.ok) return;
  const message =
    statusMessages?.[response.status] ??
    (useServerMessage
      ? await readApiErrorMessage(response, errorMessage)
      : errorMessage);
  throw new ApiError(message, { status: response.status });
}

/** Parses a JSON body and validates it, throwing `invalidMessage` otherwise. */
export async function parseJsonResponse<T>(
  response: Response,
  schema: z.ZodType<T>,
  invalidMessage: string,
): Promise<T> {
  let payload: unknown;
  try {
    payload = await response.json();
  } catch (error) {
    throw new ApiError(invalidMessage, {
      cause: error,
      status: response.status,
    });
  }
  const parsed = schema.safeParse(payload);
  if (!parsed.success) {
    throw new ApiError(invalidMessage, {
      cause: parsed.error,
      status: response.status,
    });
  }
  return parsed.data;
}

/** Sends a request, checks its status and validates the JSON response. */
export async function requestJson<T>(
  url: string,
  schema: z.ZodType<T>,
  options: RequestJsonOptions,
): Promise<T> {
  // El mismo plazo cubre conexión, cabeceras y un cuerpo que quede bloqueado.
  return withTransportDeadline(options, async (init) => {
    const response = await sendRequest(url, { ...options, init, timeoutMs: 0 });
    await assertResponseOk(response, options);
    return parseJsonResponse(response, schema, options.invalidMessage);
  });
}

async function withTransportDeadline<T>(
  { init, fetcher, timeoutMs = 12_000, errorMessage }: SendRequestOptions,
  operation: (init: RequestInit | undefined) => Promise<T>,
): Promise<T> {
  if (timeoutMs === 0) return operation(init);
  const signals = [
    ...new Set([
      ...(init?.signal ? [init.signal] : []),
      ...(fetcher ? (requestSignals.get(fetcher) ?? []) : []),
    ]),
  ];
  const controller = new AbortController();
  let rejectLimit!: (error: Error) => void;
  const limit = new Promise<never>((_, reject) => {
    rejectLimit = reject;
  });
  const cancel = () => {
    const error = new Error("La solicitud fue cancelada.");
    error.name = "AbortError";
    rejectLimit(error);
    controller.abort(error);
  };
  for (const signal of signals)
    signal.addEventListener("abort", cancel, { once: true });
  const timer = setTimeout(() => {
    const error = new ApiError(errorMessage);
    rejectLimit(error);
    controller.abort(error);
  }, timeoutMs);
  try {
    const aborted = signals.some((signal) => signal.aborted);
    if (aborted) cancel();
    return await Promise.race([
      limit,
      aborted ? limit : operation({ ...init, signal: controller.signal }),
    ]);
  } finally {
    clearTimeout(timer);
    for (const signal of signals) signal.removeEventListener("abort", cancel);
  }
}

function isAbortError(error: unknown): boolean {
  return error instanceof Error && error.name === "AbortError";
}
