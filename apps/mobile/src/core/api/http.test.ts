import { describe, expect, it, vi } from "vitest";
import { z } from "zod";

import {
  ApiError,
  isApiUnavailableError,
  readApiErrorMessage,
  requestJson,
} from "./http";
import { resolveMediaUrl } from "./media-url";
import { isPersistedQueryKey, queryKeys } from "./query-keys";

const schema = z.object({ data: z.object({ name: z.string() }) });
const messages = {
  errorMessage: "No pudimos cargar el lugar.",
  invalidMessage: "El lugar no tiene el formato esperado.",
};

function jsonResponse(body: unknown, status = 200) {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
  } as Response;
}

describe("requestJson", () => {
  it("returns validated data", async () => {
    const fetcher = vi
      .fn()
      .mockResolvedValue(jsonResponse({ data: { name: "Guaranda" } }));

    await expect(
      requestJson("http://api.test/places/1", schema, {
        ...messages,
        fetcher,
        init: { headers: { Accept: "application/json" } },
      }),
    ).resolves.toEqual({ data: { name: "Guaranda" } });
    expect(fetcher).toHaveBeenCalledWith("http://api.test/places/1", {
      headers: { Accept: "application/json" },
    });
  });

  it("calls the fetcher without init when none is given", async () => {
    const fetcher = vi
      .fn()
      .mockResolvedValue(jsonResponse({ data: { name: "Guaranda" } }));

    await requestJson("http://api.test/places/1", schema, {
      ...messages,
      fetcher,
    });
    expect(fetcher).toHaveBeenCalledWith("http://api.test/places/1");
  });

  it("hides network failures behind the user-facing message", async () => {
    const fetcher = vi
      .fn()
      .mockRejectedValue(new TypeError("Network request failed"));

    const error = await requestJson("http://api.test", schema, {
      ...messages,
      fetcher,
    }).catch((cause: unknown) => cause);

    expect(error).toBeInstanceOf(ApiError);
    expect((error as ApiError).message).toBe(messages.errorMessage);
    expect((error as ApiError).status).toBeUndefined();
    expect(isApiUnavailableError(error)).toBe(true);
  });

  it("rethrows cancellations untouched", async () => {
    const abort = new DOMException("Aborted", "AbortError");
    const fetcher = vi.fn().mockRejectedValue(abort);

    await expect(
      requestJson("http://api.test", schema, { ...messages, fetcher }),
    ).rejects.toBe(abort);
  });

  it("hides JSON parse failures behind the invalid-format message", async () => {
    const fetcher = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => {
        throw new SyntaxError("Unexpected token < in JSON");
      },
    });

    await expect(
      requestJson("http://api.test", schema, { ...messages, fetcher }),
    ).rejects.toThrow(messages.invalidMessage);
  });

  it("rejects bodies that do not match the schema", async () => {
    const fetcher = vi.fn().mockResolvedValue(jsonResponse({ data: {} }));

    await expect(
      requestJson("http://api.test", schema, { ...messages, fetcher }),
    ).rejects.toThrow(messages.invalidMessage);
  });

  it("maps known statuses and keeps the status code", async () => {
    const fetcher = vi.fn().mockResolvedValue(jsonResponse({}, 404));

    const error = await requestJson("http://api.test", schema, {
      ...messages,
      fetcher,
      statusMessages: { 404: "El lugar ya no está disponible." },
    }).catch((cause: unknown) => cause);

    expect((error as ApiError).message).toBe("El lugar ya no está disponible.");
    expect((error as ApiError).status).toBe(404);
    expect(isApiUnavailableError(error)).toBe(false);
  });

  it("uses the server message only when requested", async () => {
    const body = { error: { message: "El correo ya está registrado." } };
    const fetcher = vi.fn().mockResolvedValue(jsonResponse(body, 409));

    await expect(
      requestJson("http://api.test", schema, { ...messages, fetcher }),
    ).rejects.toThrow(messages.errorMessage);
    await expect(
      requestJson("http://api.test", schema, {
        ...messages,
        fetcher,
        useServerMessage: true,
      }),
    ).rejects.toThrow("El correo ya está registrado.");
  });
});

describe("readApiErrorMessage", () => {
  it("falls back when the body has no usable message", async () => {
    await expect(
      readApiErrorMessage(jsonResponse({ error: { message: 42 } }), "Fallo"),
    ).resolves.toBe("Fallo");
    await expect(
      readApiErrorMessage(
        {
          json: async () => {
            throw new SyntaxError("not json");
          },
        } as unknown as Response,
        "Fallo",
      ),
    ).resolves.toBe("Fallo");
  });
});

describe("resolveMediaUrl", () => {
  it("serves relative media from the API host", () => {
    expect(resolveMediaUrl("/media/photo.jpg", "https://api.test/api/v1")).toBe(
      "https://api.test/media/photo.jpg",
    );
    expect(
      resolveMediaUrl("https://cdn.test/photo.jpg", "https://api.test/api/v1"),
    ).toBe("https://cdn.test/photo.jpg");
  });
});

describe("query persistence policy", () => {
  it("persists public catalogs and saved places only", () => {
    expect(isPersistedQueryKey([...queryKeys.publishedCenter, "A"])).toBe(true);
    expect(isPersistedQueryKey([...queryKeys.savedCenters, 7])).toBe(true);
    expect(isPersistedQueryKey([...queryKeys.ownOpinion, "A", 7])).toBe(false);
    expect(isPersistedQueryKey([...queryKeys.publicSearch, "mirador"])).toBe(
      false,
    );
    expect(isPersistedQueryKey([...queryKeys.mapEstablishments, null])).toBe(
      false,
    );
  });
});
