import { describe, expect, it, vi } from "vitest";

import { askTourismAgent, askTourismAgentStream } from "./agent-api";

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
        {
          apiUrl: "http://api.test/api/v1",
          fetcher,
          location: {
            latitude: -1.59234,
            longitude: -79.00123,
            accuracyMeters: 35,
          },
        },
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
        sources: [
          { type: "poi", label: "Catálogo público geolocalizado" },
          { type: "transport", label: "Registro institucional de transporte" },
          { type: "routing", label: "Cálculo de ruta vial" },
        ],
      }),
      ok: true,
    });

    await expect(
      askTourismAgent("¿Qué hay cerca?", [], {
        apiUrl: "http://api.test/api/v1",
        fetcher,
      }),
    ).resolves.toMatchObject({
      cards: [{ type: "poi", name: "Plaza cultural" }],
      actions: [{ destination: { type: "poi" } }],
    });
    expect(fetcher.mock.calls[0]?.[1]).not.toHaveProperty("id");
  });

  it("reconstructs fragmented SSE events and forwards cumulative text", async () => {
    const chunks = [
      'data: {"type":"text-delta","text":"Ho',
      'la"}\n\n' +
        'data: {"type":"complete","response":{"text":"Hola viajero.","cards":[],"actions":[],"sources":[]}}\n\n' +
        "data: [DONE]\n\n",
    ];
    const encoder = new TextEncoder();
    const fetcher = vi.fn().mockResolvedValue(
      new Response(
        new ReadableStream<Uint8Array>({
          start(controller) {
            for (const chunk of chunks)
              controller.enqueue(encoder.encode(chunk));
            controller.close();
          },
        }),
        { headers: { "content-type": "text/event-stream" }, status: 200 },
      ),
    );
    const textParts: string[] = [];

    await expect(
      askTourismAgentStream(
        "Hola",
        [],
        (text) => {
          textParts.push(text);
        },
        { apiUrl: "http://api.test/api/v1", fetcher },
      ),
    ).resolves.toEqual({
      text: "Hola viajero.",
      cards: [],
      actions: [],
      sources: [],
    });

    expect(textParts).toEqual(["Hola"]);
    expect(fetcher).toHaveBeenCalledWith(
      "http://api.test/api/v1/ai/chat/stream",
      expect.objectContaining({
        headers: {
          Accept: "text/event-stream",
          "Content-Type": "application/json",
        },
        method: "POST",
      }),
    );
  });

  it("rejects a stream without a final response", async () => {
    const fetcher = vi.fn().mockResolvedValue(
      new Response('data: {"type":"text-delta","text":"Hola"}\n\n', {
        headers: { "content-type": "text/event-stream" },
        status: 200,
      }),
    );

    await expect(
      askTourismAgentStream("Hola", [], vi.fn(), {
        apiUrl: "http://api.test/api/v1",
        fetcher,
      }),
    ).rejects.toThrow("respuesta incompleta");
  });

  it("rejects malformed structured responses", async () => {
    const fetcher = vi.fn().mockResolvedValue({
      json: async () => ({ text: "solo texto" }),
      ok: true,
    });
    await expect(
      askTourismAgent("Hola", [], {
        apiUrl: "http://api.test/api/v1",
        fetcher,
      }),
    ).rejects.toThrow("formato inválido");
  });

  it("surfaces provider errors without exposing response details", async () => {
    const fetcher = vi
      .fn()
      .mockResolvedValue({ ok: false, text: async () => "secret" });
    await expect(
      askTourismAgent("Hola", [], {
        apiUrl: "http://api.test/api/v1",
        fetcher,
      }),
    ).rejects.toThrow("agente no está disponible");
  });
});
