import { describe, expect, it } from "vitest";

import type { AgentMessage } from "./agent";
import {
  agentIntroMessage,
  agentStarterPrompts,
  buildAgentHistory,
  getRetryableAgentTurn,
  showsAgentStarterPrompts,
} from "./agent-conversation";
import { AGENT_MESSAGE_MAX_LENGTH } from "./agent";

function user(id: number, text: string): AgentMessage {
  return { id: `user-${id}`, role: "user", text };
}

function assistant(
  id: number,
  text: string,
  kind?: AgentMessage["kind"],
): AgentMessage {
  return { id: `assistant-${id}`, kind, role: "assistant", text };
}

describe("agent history", () => {
  it("sends completed exchanges and skips the greeting", () => {
    expect(
      buildAgentHistory([
        agentIntroMessage,
        user(1, "¿Qué visito en Guaranda?"),
        assistant(2, "El mirador de la ciudad."),
      ]),
    ).toEqual([
      { role: "user", content: "¿Qué visito en Guaranda?" },
      { role: "assistant", content: "El mirador de la ciudad." },
    ]);
  });

  it("leaves out failed and interrupted exchanges", () => {
    expect(
      buildAgentHistory([
        agentIntroMessage,
        user(1, "Hola"),
        assistant(2, "El agente no está disponible.", "error"),
        user(3, "¿Y ahora?"),
        assistant(4, "Te recomiendo", "partial"),
        assistant(5, "No pudimos responder ahora.", "error"),
        user(6, "Un café cerca"),
        assistant(7, "Hay una cafetería a 200 m."),
        // Pending question without an answer yet.
        user(8, "Gracias"),
      ]),
    ).toEqual([
      { role: "user", content: "Un café cerca" },
      { role: "assistant", content: "Hay una cafetería a 200 m." },
    ]);
  });

  it("keeps the latest twelve items within the content limit", () => {
    const messages = Array.from({ length: 8 }, (_, turn) => [
      user(turn * 2, `Pregunta ${turn}`),
      assistant(
        turn * 2 + 1,
        turn === 7 ? "x".repeat(2_100) : `Respuesta ${turn}`,
      ),
    ]).flat();

    const history = buildAgentHistory(messages);

    expect(history).toHaveLength(12);
    expect(history[0]).toEqual({ role: "user", content: "Pregunta 2" });
    expect(history.at(-1)?.content).toHaveLength(2_000);
  });
});

describe("retrying an agent turn", () => {
  it("reuses the failed question and keeps only completed earlier turns", () => {
    const previous = [
      agentIntroMessage,
      user(1, "¿Qué visitar?"),
      assistant(2, "El mirador."),
    ];
    expect(
      getRetryableAgentTurn([
        ...previous,
        user(3, "¿Cómo llego?"),
        assistant(4, "Respuesta detenida.", "error"),
      ]),
    ).toEqual({ question: "¿Cómo llego?", previous });
  });

  it("does not retry a completed or partial response", () => {
    expect(
      getRetryableAgentTurn([user(1, "Hola"), assistant(2, "Hola")]),
    ).toBeNull();
    expect(
      getRetryableAgentTurn([user(1, "Hola"), assistant(2, "Ho", "partial")]),
    ).toBeNull();
  });
});

describe("agent starter prompts", () => {
  it("are valid questions for the agent", () => {
    for (const prompt of agentStarterPrompts) {
      expect(prompt.text.trim()).toBe(prompt.text);
      expect(prompt.text.length).toBeLessThanOrEqual(AGENT_MESSAGE_MAX_LENGTH);
    }
  });

  it("show only until the first question is sent", () => {
    expect(showsAgentStarterPrompts([agentIntroMessage])).toBe(true);
    expect(showsAgentStarterPrompts([agentIntroMessage, user(1, "Hola")])).toBe(
      false,
    );
  });
});
