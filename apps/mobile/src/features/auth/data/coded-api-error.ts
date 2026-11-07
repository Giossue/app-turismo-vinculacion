import { z } from "zod";

import {
  ApiError,
  requestJson,
  type Fetcher,
  type RequestJsonOptions,
} from "@/core/api/http";

const errorCodeSchema = z.object({
  error: z.object({ code: z.string().min(1) }),
});

/** Rechazo de la API con un código propio y un mensaje ya traducido. */
export class CodedApiError extends ApiError {
  readonly code: string;

  constructor(
    message: string,
    options: Readonly<{ cause?: unknown; code: string; status?: number }>,
  ) {
    super(message, options);
    this.name = "CodedApiError";
    this.code = options.code;
  }
}

export function isLegalVersionOutdatedError(error: unknown): boolean {
  return (
    error instanceof CodedApiError && error.code === "LEGAL_VERSION_OUTDATED"
  );
}

/**
 * `requestJson` con los códigos de `{ error: { code, message } }`. La API
 * responde el mismo estado a errores distintos (409 o 400), así que solo el
 * código los separa. Un código sin mensaje conocido conserva el error normal.
 */
export async function requestCodedJson<T>(
  url: string,
  schema: z.ZodType<T>,
  {
    codeMessages,
    fetcher = fetch,
    ...options
  }: RequestJsonOptions &
    Readonly<{ codeMessages: Readonly<Record<string, string>> }>,
): Promise<T> {
  let code: string | null = null;
  const readingCode: Fetcher = async (input, init) => {
    const response = await fetcher(input, init);
    // La copia deja intacto el cuerpo que `requestJson` lee para su mensaje.
    if (!response.ok) code = await readErrorCode(response.clone());
    return response;
  };
  try {
    return await requestJson(url, schema, {
      ...options,
      fetcher: readingCode,
    });
  } catch (error) {
    const message = code === null ? undefined : codeMessages[code];
    if (code === null || message === undefined) throw error;
    if (!(error instanceof ApiError)) throw error;
    throw new CodedApiError(message, {
      cause: error,
      code,
      status: error.status,
    });
  }
}

async function readErrorCode(response: Response): Promise<string | null> {
  try {
    const payload = errorCodeSchema.safeParse(await response.json());
    return payload.success ? payload.data.error.code : null;
  } catch {
    return null;
  }
}
