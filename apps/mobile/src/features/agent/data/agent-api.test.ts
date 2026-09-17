import { describe, expect, it, vi } from "vitest";

import { askTourismAgent } from "./agent-api";

describe("askTourismAgent", () => {
  it("sends only the conversation contract and returns streamed text", async () => {
    const fetcher = vi.fn().mockResolvedValue({
      ok: true,
      text: async () => "Hay un mirador publicado en Guaranda.",
    });

    await expect(
      askTourismAgent(
        "Quiero una buena vista",
        [{ role: "user", content: "Estoy en Guaranda" }],
        fetcher,
        "http://api.test/api/v1",
      ),
    ).resolves.toContain("mirador publicado");
    expect(fetcher).toHaveBeenCalledWith("http://api.test/api/v1/ai/chat", {
      body: JSON.stringify({
        message: "Quiero una buena vista",
        history: [{ role: "user", content: "Estoy en Guaranda" }],
      }),
      headers: { Accept: "text/plain", "Content-Type": "application/json" },
      method: "POST",
    });
  });

  it("surfaces provider errors without exposing response details", async () => {
    const fetcher = vi
      .fn()
      .mockResolvedValue({ ok: false, text: async () => "secret" });
    await expect(
      askTourismAgent("Hola", [], fetcher, "http://api.test/api/v1"),
    ).rejects.toThrow("agente no está disponible");
  });
});
