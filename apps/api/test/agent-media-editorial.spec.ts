import { ConfigService } from "@nestjs/config";
import { describe, expect, it, vi } from "vitest";

import {
  AgentEditorialService,
  editorialInputSchema,
} from "../src/ai/application/agent-editorial.service";
import { AgentMediaService } from "../src/ai/application/agent-media.service";

const generated = vi.hoisted(() => vi.fn());
vi.mock("ai", async (original) => ({
  ...(await original<typeof import("ai")>()),
  generateText: generated,
}));

const config = new ConfigService({
  AI_PROVIDER: "openai",
  AI_MODEL: "gpt-4o-mini",
  OPENAI_API_KEY: "test-key",
});

describe("agent media", () => {
  it("rejects files with a mismatched MIME type or signature before calling a provider", async () => {
    const service = new AgentMediaService(config, {} as never, {} as never);
    await expect(
      service.analyzePhoto(Buffer.from("hello"), "image/jpeg"),
    ).rejects.toThrow("La foto debe ser JPEG");
    await expect(
      service.transcribeAudio(Buffer.from("hello"), "audio/mp4"),
    ).rejects.toThrow("El audio debe ser M4A");
    expect(generated).not.toHaveBeenCalled();
  });

  it("returns tentative published matches and their source for a recognized photo", async () => {
    generated.mockResolvedValueOnce({
      output: {
        description: "Una torre de piedra",
        placeName: "Torre Guaranda",
      },
    });
    const centers = {
      listPublished: vi.fn().mockResolvedValue({
        items: [
          {
            code: "020101MC010202001",
            name: "Torre Guaranda",
            description: "Mirador publicado",
            type: "Cultural",
            category: "Cultural",
            latitude: -1.59,
            longitude: -79,
          },
        ],
      }),
    };
    const establishments = { browse: vi.fn().mockResolvedValue([]) };
    const service = new AgentMediaService(
      config,
      centers as never,
      establishments as never,
    );
    const result = await service.analyzePhoto(
      Buffer.from([0xff, 0xd8, 0xff, 0x01]),
      "image/jpeg",
    );
    expect(result.cards).toHaveLength(1);
    expect(result.sources).toEqual([
      {
        type: "center",
        label: "Catálogo de centros turísticos: Torre Guaranda",
      },
    ]);
    expect(result.text).toContain("posibles registros");
    expect(centers.listPublished).toHaveBeenCalledWith({
      text: "Torre Guaranda",
      limit: 3,
    });
  });

  it("submits audio to the documented transcription model and returns editable text", async () => {
    const fetcher = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ text: "¿Dónde puedo comer?" }),
    });
    vi.stubGlobal("fetch", fetcher);
    try {
      const service = new AgentMediaService(config, {} as never, {} as never);
      const result = await service.transcribeAudio(
        Buffer.from("0000ftypisom"),
        "audio/mp4",
      );
      expect(result.text).toBe("¿Dónde puedo comer?");
      const body = fetcher.mock.calls[0][1].body as FormData;
      expect(body.get("model")).toBe("gpt-4o-mini-transcribe");
    } finally {
      vi.unstubAllGlobals();
    }
  });

  it("states when a photo has no catalog match", async () => {
    generated.mockResolvedValueOnce({
      output: { description: "Una cascada", placeName: null },
    });
    const centers = { listPublished: vi.fn() };
    const establishments = { browse: vi.fn() };
    const service = new AgentMediaService(
      config,
      centers as never,
      establishments as never,
    );
    const result = await service.analyzePhoto(
      Buffer.from([0xff, 0xd8, 0xff, 0x01]),
      "image/jpeg",
    );
    expect(result.cards).toEqual([]);
    expect(result.sources).toEqual([]);
    expect(result.text).toContain("No pude identificar con seguridad");
    expect(centers.listPublished).not.toHaveBeenCalled();
  });
});

describe("agent editorial assistance", () => {
  it("rejects too-short descriptions and non-allowlisted modes", () => {
    expect(
      editorialInputSchema.safeParse({ description: "Breve", mode: "rewrite" })
        .success,
    ).toBe(false);
    expect(
      editorialInputSchema.safeParse({
        description: "Una descripción turística suficientemente larga",
        mode: "publish",
      }).success,
    ).toBe(false);
  });

  it("uses owner-scoped access and sends only the draft name and supplied text", async () => {
    generated.mockResolvedValueOnce({
      output: {
        suggestion: "La torre ofrece una vista del entorno.",
        observations: [],
      },
    });
    const centers = {
      find: vi.fn().mockResolvedValue({
        draft: {
          name: "Torre",
          description: "Otro texto",
          privatePhone: "secret",
        },
      }),
    };
    const service = new AgentEditorialService(config, centers as never);
    const result = await service.assist("code", 9, false, {
      description: "La torre tiene una vista del entorno.",
      mode: "rewrite",
    });
    expect(result.requiresReview).toBe(true);
    expect(centers.find).toHaveBeenCalledWith("code", 9, false);
    const prompt = JSON.parse(
      generated.mock.lastCall?.[0].prompt as string,
    ) as Record<string, unknown>;
    expect(prompt).toEqual({
      mode: "rewrite",
      name: "Torre",
      description: "La torre tiene una vista del entorno.",
    });
  });

  it("does not call the model when the owner check fails", async () => {
    const centers = {
      find: vi.fn().mockRejectedValue(new Error("No autorizado")),
    };
    const service = new AgentEditorialService(config, centers as never);
    generated.mockClear();
    await expect(
      service.assist("code", 9, false, {
        description: "Descripción con suficiente longitud.",
        mode: "review",
      }),
    ).rejects.toThrow("No autorizado");
    expect(generated).not.toHaveBeenCalled();
  });
});
