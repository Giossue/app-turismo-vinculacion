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
  it("rejects audio with a mismatched MIME type or signature", async () => {
    const service = new AgentMediaService(config);
    await expect(
      service.transcribeAudio(Buffer.from("hello"), "audio/mp4"),
    ).rejects.toThrow("El audio debe ser M4A");
  });

  it("submits audio to the documented transcription model and returns editable text", async () => {
    const fetcher = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ text: "¿Dónde puedo comer?" }),
    });
    vi.stubGlobal("fetch", fetcher);
    try {
      const service = new AgentMediaService(config);
      const result = await service.transcribeAudio(
        Buffer.from("0000ftypisom"),
        "audio/mp4",
      );
      expect(result.text).toBe("¿Dónde puedo comer?");
      const body = fetcher.mock.calls[0][1].body as FormData;
      expect(body.get("model")).toBe("gpt-transcribe");
    } finally {
      vi.unstubAllGlobals();
    }
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
