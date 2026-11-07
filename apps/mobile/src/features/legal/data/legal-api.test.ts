import { describe, expect, it, vi } from "vitest";

import { getLegalDocuments } from "./legal-api";

const apiUrl = "http://api.test/api/v1";
const document = (type: string) => ({
  type,
  version: "2026-11",
  title: "Documento",
  publishedAt: "2026-11-01",
  sections: [{ heading: "Objeto", body: "Uno.\n\nDos." }],
});

describe("legal documents API", () => {
  it("reads the public documents without credentials", async () => {
    const fetcher = vi.fn(async () =>
      Response.json({ data: [document("terms"), document("privacy")] }),
    );

    await expect(getLegalDocuments(fetcher, apiUrl)).resolves.toMatchObject([
      { type: "terms", version: "2026-11" },
      { type: "privacy", version: "2026-11" },
    ]);
    const [url, init] = fetcher.mock.calls[0] as unknown as [
      string,
      RequestInit,
    ];
    expect(url).toBe(`${apiUrl}/legal/documents`);
    expect(new Headers(init.headers).has("Authorization")).toBe(false);
  });

  it("refuses a response that lacks one of the documents", async () => {
    const fetcher = vi.fn(async () =>
      Response.json({ data: [document("terms")] }),
    );

    await expect(getLegalDocuments(fetcher, apiUrl)).rejects.toThrow(
      "No se pudieron cargar los documentos legales.",
    );
  });

  it.each([
    ["a server failure", vi.fn(async () => new Response(null, { status: 503 }))],
    [
      "a network failure",
      vi.fn().mockRejectedValue(new TypeError("Network request failed")),
    ],
  ])("hides the technical detail of %s", async (_name, fetcher) => {
    await expect(getLegalDocuments(fetcher, apiUrl)).rejects.toThrow(
      "No se pudieron cargar los documentos legales.",
    );
  });
});
