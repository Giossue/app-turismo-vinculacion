import { describe, expect, it, vi } from "vitest";
import { ZodError } from "zod";

import { ApiError } from "@/core/api/http";
import { agentResponseSchema } from "../domain/agent";
import {
  AGENT_INVALID_FORMAT_MESSAGE,
  askTourismAgentStream,
  buildAgentRequestBody,
} from "./agent-api";

const apiUrl = "http://api.test/api/v1";

function sseResponse(chunks: readonly string[]): Response {
  const encoder = new TextEncoder();
  return new Response(
    new ReadableStream<Uint8Array>({
      start(controller) {
        for (const chunk of chunks) controller.enqueue(encoder.encode(chunk));
        controller.close();
      },
    }),
    { headers: { "content-type": "text/event-stream" }, status: 200 },
  );
}

function completeEvent(response: unknown): string {
  return `data: ${JSON.stringify({ type: "complete", response })}\n\n`;
}

describe("buildAgentRequestBody", () => {
  it("rounds the location and clamps its accuracy to the contract", () => {
    expect(
      buildAgentRequestBody(
        "Quiero una buena vista",
        [{ role: "user", content: "Estoy en Guaranda" }],
        { latitude: -1.59234, longitude: -79.00123, accuracyMeters: 35_000 },
      ),
    ).toEqual({
      message: "Quiero una buena vista",
      history: [{ role: "user", content: "Estoy en Guaranda" }],
      location: {
        latitude: -1.592,
        longitude: -79.001,
        accuracyMeters: 10_000,
      },
    });
  });

  it("rejects messages beyond the API limit", () => {
    expect(() => buildAgentRequestBody("x".repeat(2_001), [])).toThrow(
      ZodError,
    );
  });
});

describe("agent response schema", () => {
  it("accepts POI cards and route actions without an internal identifier", () => {
    expect(
      agentResponseSchema.parse({
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
    ).toMatchObject({
      cards: [{ type: "poi", name: "Plaza cultural" }],
      actions: [{ destination: { type: "poi" } }],
    });
  });
});

describe("askTourismAgentStream", () => {
  it("rejects a retired itinerary from an outdated API response", async () => {
    const fetcher = vi.fn().mockResolvedValue(
      sseResponse([
        completeEvent({
          text: "Plan de paseo",
          cards: [],
          actions: [],
          sources: [],
          itinerary: {
            title: "Plan",
            summary: "Paseo",
            stops: ["GUA-001", "GUA-002"].map((code, index) => ({
              type: "center",
              code,
              name: "Centro publicado",
              latitude: -1.59,
              longitude: -79,
              order: index + 1,
            })),
          },
        }),
      ]),
    );
    await expect(
      askTourismAgentStream("Hola", [], vi.fn(), { apiUrl, fetcher }),
    ).rejects.toThrow(AGENT_INVALID_FORMAT_MESSAGE);
  });

  it("reconstructs fragmented SSE events and forwards cumulative text", async () => {
    const locatedCenter = {
      type: "center",
      code: "GUA-001",
      name: "Centro cultural",
      summary: "Descripción publicada",
      category: "Manifestaciones culturales",
      address: "Calle Sucre",
      localityName: "Guaranda",
      latitude: -1.59,
      longitude: -79,
      distanceMeters: null,
    };
    const fetcher = vi.fn().mockResolvedValue(
      sseResponse([
        'data: {"type":"text-delta","text":"Ho',
        'la"}\n\n' +
          completeEvent({
            text: "Hola viajero.",
            cards: [locatedCenter],
            actions: [],
            sources: [],
          }) +
          "data: [DONE]\n\n",
      ]),
    );
    const textParts: string[] = [];

    await expect(
      askTourismAgentStream(
        "Hola",
        [],
        (text) => {
          textParts.push(text);
        },
        {
          apiUrl,
          fetcher,
          location: { latitude: -1.59234, longitude: -79.00123 },
        },
      ),
    ).resolves.toEqual({
      text: "Hola viajero.",
      cards: [locatedCenter],
      actions: [],
      sources: [],
    });

    expect(textParts).toEqual(["Hola"]);
    expect(fetcher).toHaveBeenCalledWith(`${apiUrl}/ai/chat/stream`, {
      body: JSON.stringify({
        message: "Hola",
        history: [],
        location: { latitude: -1.592, longitude: -79.001 },
      }),
      headers: {
        Accept: "text/event-stream",
        "Content-Type": "application/json",
        "X-Turismo-Agent-Card-Locations": "1",
      },
      method: "POST",
      signal: undefined,
    });
  });

  it("rejects a stream without a final response", async () => {
    const fetcher = vi
      .fn()
      .mockResolvedValue(
        sseResponse(['data: {"type":"text-delta","text":"Hola"}\n\n']),
      );

    await expect(
      askTourismAgentStream("Hola", [], vi.fn(), { apiUrl, fetcher }),
    ).rejects.toThrow("respuesta incompleta");
  });

  it("rejects malformed structured responses with a safe message", async () => {
    const fetcher = vi
      .fn()
      .mockResolvedValue(sseResponse([completeEvent({ text: "solo texto" })]));

    const request = askTourismAgentStream("Hola", [], vi.fn(), {
      apiUrl,
      fetcher,
    });
    await expect(request).rejects.toBeInstanceOf(ApiError);
    await expect(request).rejects.toThrow(AGENT_INVALID_FORMAT_MESSAGE);
  });

  it("surfaces the agent's error events", async () => {
    const fetcher = vi
      .fn()
      .mockResolvedValue(
        sseResponse([
          'data: {"type":"error","message":"El agente no está disponible en este momento."}\n\n',
        ]),
      );

    await expect(
      askTourismAgentStream("Hola", [], vi.fn(), { apiUrl, fetcher }),
    ).rejects.toThrow("agente no está disponible");
  });

  it("surfaces provider errors without exposing response details", async () => {
    const fetcher = vi.fn().mockResolvedValue({
      ok: false,
      status: 503,
      text: async () => "secret",
    });

    await expect(
      askTourismAgentStream("Hola", [], vi.fn(), { apiUrl, fetcher }),
    ).rejects.toThrow("agente no está disponible");
  });

  it("stops reading when the conversation is closed", async () => {
    const controller = new AbortController();
    const fetcher = vi.fn().mockResolvedValue(
      new Response(
        new ReadableStream<Uint8Array>({
          start(stream) {
            stream.enqueue(
              new TextEncoder().encode(
                'data: {"type":"text-delta","text":"Hola"}\n\n',
              ),
            );
            // The server keeps the connection open.
          },
        }),
        { status: 200 },
      ),
    );

    const request = askTourismAgentStream(
      "Hola",
      [],
      () => controller.abort(),
      { apiUrl, fetcher, signal: controller.signal },
    );

    await expect(request).rejects.toThrow("respuesta incompleta");
  });
});

describe("askTourismAgentStream abort handling", () => {
  function openStream(onCancel: () => void, chunks: readonly string[]) {
    const encoder = new TextEncoder();
    return new Response(
      new ReadableStream<Uint8Array>({
        start(stream) {
          for (const chunk of chunks) stream.enqueue(encoder.encode(chunk));
          // The server keeps the connection open.
        },
        cancel: onCancel,
      }),
      { status: 200 },
    );
  }

  it("cancels the stream when aborted before the body is read", async () => {
    const controller = new AbortController();
    const cancelled = vi.fn();
    const onText = vi.fn();
    const fetcher = vi.fn().mockImplementation(async () => {
      // Closed while the request was still resolving.
      controller.abort();
      return openStream(cancelled, [
        'data: {"type":"text-delta","text":"Hola"}\n\n',
        completeEvent({ text: "Hola.", cards: [], actions: [], sources: [] }),
      ]);
    });

    await expect(
      askTourismAgentStream("Hola", [], onText, {
        apiUrl,
        fetcher,
        signal: controller.signal,
      }),
    ).rejects.toThrow("respuesta incompleta");
    expect(cancelled).toHaveBeenCalledTimes(1);
    expect(onText).not.toHaveBeenCalled();
  });

  it("stops after the chunk during which the abort happened", async () => {
    const controller = new AbortController();
    const cancelled = vi.fn();
    const onText = vi.fn(() => controller.abort());
    const fetcher = vi
      .fn()
      .mockResolvedValue(
        openStream(cancelled, [
          'data: {"type":"text-delta","text":"Hola"}\n\n',
          'data: {"type":"text-delta","text":"Hola viajero"}\n\n',
        ]),
      );

    await expect(
      askTourismAgentStream("Hola", [], onText, {
        apiUrl,
        fetcher,
        signal: controller.signal,
      }),
    ).rejects.toThrow("respuesta incompleta");
    expect(cancelled).toHaveBeenCalled();
    expect(onText).toHaveBeenCalledTimes(1);
  });
});
