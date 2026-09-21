import { describe, expect, it, vi } from "vitest";

import { askTourismAgent } from "./agent-api";

describe("askTourismAgent", () => {
  it("sends approximate location and returns the structured response", async () => {
    const fetcher = vi.fn().mockResolvedValue({
      json: async () => ({
        text: "Hay un mirador publicado en Guaranda.",
        cards: [],
        actions: [],
        itinerary: {
          title: "Paseo recomendado",
          summary: "Lugares publicados para visitar.",
          stops: [
            {
              type: "center",
              code: "GUA-001",
              name: "Primer lugar",
              latitude: -1.59,
              longitude: -79,
              order: 1,
            },
            {
              type: "center",
              code: "GUA-002",
              name: "Segundo lugar",
              latitude: -1.58,
              longitude: -79.01,
              order: 2,
            },
          ],
        },
        sources: [],
      }),
      ok: true,
    });

    await expect(
      askTourismAgent(
        "Quiero una buena vista",
        [{ role: "user", content: "Estoy en Guaranda" }],
        fetcher,
        "http://api.test/api/v1",
        { latitude: -1.59234, longitude: -79.00123, accuracyMeters: 35 },
      ),
    ).resolves.toMatchObject({
      itinerary: { stops: [{ code: "GUA-001" }, { code: "GUA-002" }] },
      text: expect.stringContaining("mirador"),
    });
    expect(fetcher).toHaveBeenCalledWith("http://api.test/api/v1/ai/chat", {
      body: JSON.stringify({
        message: "Quiero una buena vista",
        history: [{ role: "user", content: "Estoy en Guaranda" }],
        location: { latitude: -1.592, longitude: -79.001, accuracyMeters: 35 },
      }),
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
      },
      method: "POST",
    });
  });

  it("accepts POI cards and route actions without an internal identifier", async () => {
    const fetcher = vi.fn().mockResolvedValue({
      json: async () => ({
        text: "Encontré un punto de interés cercano.",
        cards: [
          {
            type: "poi",
            name: "Plaza cultural",
            summary: "Un lugar para caminar.",
            category: "Punto de interés",
            localityName: "Guaranda",
            latitude: -1.5934,
            longitude: -79.0008,
            distanceMeters: 180,
          },
        ],
        actions: [
          {
            type: "start_route",
            destination: {
              type: "poi",
              name: "Plaza cultural",
              latitude: -1.5934,
              longitude: -79.0008,
            },
            mode: "foot",
            requiresConfirmation: true,
          },
        ],
        sources: [{ type: "poi", label: "Catálogo público geolocalizado" }],
      }),
      ok: true,
    });

    await expect(
      askTourismAgent("¿Qué hay cerca?", [], fetcher, "http://api.test/api/v1"),
    ).resolves.toMatchObject({
      cards: [{ type: "poi", name: "Plaza cultural" }],
      actions: [{ destination: { type: "poi" } }],
    });
    expect(fetcher.mock.calls[0]?.[1]).not.toHaveProperty("id");
  });

  it("rejects malformed structured responses", async () => {
    const fetcher = vi.fn().mockResolvedValue({
      json: async () => ({ text: "solo texto" }),
      ok: true,
    });
    await expect(
      askTourismAgent("Hola", [], fetcher, "http://api.test/api/v1"),
    ).rejects.toThrow("formato inválido");
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
