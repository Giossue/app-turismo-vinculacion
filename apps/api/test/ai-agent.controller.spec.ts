import { EventEmitter } from "node:events";
import { describe, expect, it, vi } from "vitest";

import { AiAgentController } from "../src/ai/presentation/ai-agent.controller";

const response = {
  actions: [],
  cards: [],
  sources: [],
  text: "Hola viajero.",
};

describe("AiAgentController", () => {
  it("returns the validated structured response", async () => {
    const agent = {
      generate: vi.fn().mockResolvedValue(response),
    };
    const controller = new AiAgentController(agent as never);

    await expect(
      controller.chat({ message: "Hola", history: [] }),
    ).resolves.toEqual(response);
    expect(agent.generate).toHaveBeenCalledWith({
      message: "Hola",
      history: [],
    });
  });

  it("rejects malformed chat input", async () => {
    const controller = new AiAgentController({ generate: vi.fn() } as never);
    await expect(controller.chat({ message: "" })).rejects.toThrow();
  });

  it("streams partial text and the final structured response", async () => {
    const agent = {
      generate: vi.fn(
        async (_input: unknown, onText?: (text: string) => void) => {
          onText?.("Hola");
          return response;
        },
      ),
    };
    const chunks: string[] = [];
    const events = new EventEmitter();
    const raw = {
      destroyed: false,
      writableEnded: false,
      once: events.once.bind(events),
      off: events.off.bind(events),
      writeHead: vi.fn(),
      write: vi.fn((chunk: string) => {
        chunks.push(chunk);
        return true;
      }),
      end: vi.fn(() => {
        raw.writableEnded = true;
      }),
    };
    const reply = {
      hijack: vi.fn(),
      raw,
    };
    const controller = new AiAgentController(agent as never);

    await controller.chatStream(
      { message: "Hola", history: [] },
      reply as never,
    );

    expect(reply.hijack).toHaveBeenCalledOnce();
    expect(raw.writeHead).toHaveBeenCalledWith(
      200,
      expect.objectContaining({
        "Content-Type": "text/event-stream; charset=utf-8",
      }),
    );
    expect(chunks.join("")).toContain(
      'data: {"type":"text-delta","text":"Hola"}',
    );
    expect(chunks.join("")).toContain('data: {"type":"complete","response":');
    expect(chunks.join("")).toContain('"text":"Hola viajero."');
    expect(chunks.join("")).toContain("data: [DONE]");
    expect(raw.end).toHaveBeenCalledOnce();
    expect(agent.generate).toHaveBeenCalledWith(
      { message: "Hola", history: [] },
      expect.any(Function),
      expect.any(AbortSignal),
    );
  });

  it("aborts generation when the SSE client disconnects", async () => {
    const events = new EventEmitter();
    let resolveGeneration!: (value: typeof response) => void;
    let signal: AbortSignal | undefined;
    let emitText: ((text: string) => Promise<void>) | undefined;
    const agent = {
      generate: vi.fn((...args: unknown[]) => {
        emitText = args[1] as (text: string) => Promise<void>;
        signal = args[2] as AbortSignal;
        return new Promise<typeof response>((resolve) => {
          resolveGeneration = resolve;
        });
      }),
    };
    const raw = {
      destroyed: false,
      writableEnded: false,
      once: events.once.bind(events),
      off: events.off.bind(events),
      writeHead: vi.fn(),
      write: vi.fn(),
      end: vi.fn(),
    };
    const controller = new AiAgentController(agent as never);
    const stream = controller.chatStream({ message: "Hola", history: [] }, {
      hijack: vi.fn(),
      raw,
    } as never);
    raw.destroyed = true;
    events.emit("close");
    expect(signal?.aborted).toBe(true);
    await emitText?.("late text");
    resolveGeneration(response);
    await stream;
    expect(raw.write).not.toHaveBeenCalled();
    expect(raw.end).not.toHaveBeenCalled();
  });

  it("rejects unknown request properties", async () => {
    const controller = new AiAgentController({ generate: vi.fn() } as never);
    await expect(
      controller.chat({ message: "Hola", unexpected: true }),
    ).rejects.toThrow();
  });
});
