import type { FastifyReply } from "fastify";
import { describe, expect, it, vi } from "vitest";

import { AiAgentController } from "../src/ai/presentation/ai-agent.controller";

describe("AiAgentController", () => {
  it("pipes AI SDK text chunks to the HTTP response", async () => {
    const writes: string[] = [];
    const raw = {
      end: vi.fn(),
      setHeader: vi.fn(),
      write: vi.fn((chunk: string) => writes.push(chunk)),
    };
    const reply = {
      hijack: vi.fn(),
      raw,
    } as unknown as FastifyReply;
    const agent = {
      stream: vi.fn(() => ({
        textStream: (async function* () {
          yield "Hola ";
          yield "viajero.";
        })(),
      })),
    };
    const controller = new AiAgentController(agent as never);

    await controller.chat({ message: "Hola", history: [] }, reply);

    expect(reply.hijack).toHaveBeenCalledOnce();
    expect(raw.setHeader).toHaveBeenCalledWith(
      "Content-Type",
      "text/plain; charset=utf-8",
    );
    expect(writes.join("")).toBe("Hola viajero.");
    expect(raw.end).toHaveBeenCalledOnce();
  });

  it("rejects malformed chat input", async () => {
    const controller = new AiAgentController({ stream: vi.fn() } as never);
    await expect(
      controller.chat({ message: "" }, {} as FastifyReply),
    ).rejects.toThrow();
  });
});
