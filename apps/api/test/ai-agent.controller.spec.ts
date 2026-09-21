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

  it("rejects unknown request properties", async () => {
    const controller = new AiAgentController({ generate: vi.fn() } as never);
    await expect(
      controller.chat({ message: "Hola", unexpected: true }),
    ).rejects.toThrow();
  });
});
