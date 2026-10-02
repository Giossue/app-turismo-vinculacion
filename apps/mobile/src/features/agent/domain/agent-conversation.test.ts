import { describe, expect, it } from "vitest";

import type { AgentMessage } from "./agent";
import {
  agentIntroMessage,
  agentStarterPrompts,
  buildAgentHistory,
  countAgentUserMessages,
  getRetryableAgentTurn,
  hasAgentMessageLimit,
  prepareAgentTurn,
  shouldShareAgentLocation,
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
  it("identifies the failed answer and its question for a retry", () => {
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
    ).toEqual({ question: "¿Cómo llego?", answerId: "assistant-4" });
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

describe("agent chat message limit", () => {
  const ids = { questionId: "user-new", answerId: "assistant-new" };
  const conversation = (count: number): readonly AgentMessage[] => [
    agentIntroMessage,
    ...Array.from({ length: count }, (_, index) => [
      user(index, `Pregunta ${index}`),
      assistant(index, `Respuesta ${index}`),
    ]).flat(),
  ];

  it("allows the twentieth user message and rejects the twenty-first", () => {
    const messages = conversation(19);
    const turn = prepareAgentTurn(messages, "Última pregunta", ids);
    expect(turn).not.toBeNull();
    expect(countAgentUserMessages(turn!.messages)).toBe(20);
    expect(hasAgentMessageLimit(turn!.messages)).toBe(true);
    expect(prepareAgentTurn(turn!.messages, "Una más", ids)).toBeNull();
    expect(countAgentUserMessages(messages)).toBe(19);
  });

  it("counts failed and stopped questions but excludes assistant messages", () => {
    const messages = conversation(20).map((message): AgentMessage =>
      message.role === "assistant" && message.kind !== "intro"
        ? { ...message, kind: "error", text: "Respuesta detenida." }
        : message,
    );
    expect(countAgentUserMessages(messages)).toBe(20);
    expect(prepareAgentTurn(messages, "Una más", ids)).toBeNull();
  });

  it("retries the twentieth question without consuming a new message", () => {
    const messages = [
      ...conversation(19),
      user(19, "Pregunta final"),
      assistant(19, "No disponible", "error"),
    ];
    const turn = prepareAgentTurn(messages, "Pregunta final", {
      ...ids,
      retryAnswerId: "assistant-19",
    });
    expect(turn?.question).toEqual(user(19, "Pregunta final"));
    expect(turn?.answerId).toBe("assistant-19");
    expect(countAgentUserMessages(turn!.messages)).toBe(20);
    expect(turn?.messages).toHaveLength(messages.length);
    expect(turn?.history.at(-2)?.content).toBe("Pregunta 18");
    expect(turn?.history).not.toContainEqual({
      role: "user",
      content: "Pregunta final",
    });
  });

  it("repeats an earlier location question at the limit without discarding later turns", () => {
    const messages = [...conversation(20)];
    messages[2] = {
      ...assistant(0, "Necesito ubicación"),
      actions: [{ type: "request_location" }],
    };
    const turn = prepareAgentTurn(messages, "Pregunta 0", {
      ...ids,
      retryAnswerId: "assistant-0",
    });
    expect(countAgentUserMessages(turn!.messages)).toBe(20);
    expect(turn?.messages).toHaveLength(messages.length);
    expect(turn?.messages.at(-1)).toEqual(messages.at(-1));
    expect(turn?.history).toEqual([]);
    expect(turn?.answerId).toBe("assistant-0");
  });

  it("cannot bypass the limit by inventing a retry or changing its question", () => {
    const messages = [...conversation(20)];
    messages[messages.length - 1] = assistant(19, "No disponible", "error");
    expect(
      prepareAgentTurn(messages, "Pregunta 0", {
        ...ids,
        retryAnswerId: "missing",
      }),
    ).toBeNull();
    expect(
      prepareAgentTurn(messages, "Otra pregunta", {
        ...ids,
        retryAnswerId: "assistant-19",
      }),
    ).toBeNull();
    expect(
      prepareAgentTurn(messages, "Pregunta 18", {
        ...ids,
        retryAnswerId: "assistant-18",
      }),
    ).toBeNull();
  });

  it("starts at zero in a new chat and ignores empty input", () => {
    const messages = [agentIntroMessage];
    expect(countAgentUserMessages(messages)).toBe(0);
    expect(hasAgentMessageLimit(messages)).toBe(false);
    expect(prepareAgentTurn(messages, "  ", ids)).toBeNull();
    expect(
      countAgentUserMessages(prepareAgentTurn(messages, "Hola", ids)!.messages),
    ).toBe(1);
  });
});

describe("agent starter prompts", () => {
  it("does not offer the retired planning feature", () => {
    expect(agentStarterPrompts.map((prompt) => prompt.text)).not.toContain(
      "Arma un plan para mi día",
    );
  });

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

describe("location minimization in agent requests", () => {
  it("does not share GPS for general catalog questions", () => {
    expect(
      shouldShareAgentLocation("¿Qué lugares turísticos puedo visitar?"),
    ).toBe(false);
    expect(shouldShareAgentLocation("¿Dónde puedo comer?")).toBe(false);
  });

  it("shares GPS for explicitly nearby or current-origin questions", () => {
    expect(shouldShareAgentLocation("¿Qué hay cerca de mí?")).toBe(true);
    expect(shouldShareAgentLocation("Busca sitios desde aquí")).toBe(true);
    expect(shouldShareAgentLocation("How can I get there from here?")).toBe(
      true,
    );
  });

  it("shares GPS for arrival times and routes from the visitor", () => {
    expect(shouldShareAgentLocation("¿A cuántos minutos está el museo?")).toBe(
      true,
    );
    expect(
      shouldShareAgentLocation("¿Cuánto me demoro en llegar al parque?"),
    ).toBe(true);
    expect(shouldShareAgentLocation("¿Cómo llego al museo?")).toBe(true);
    expect(
      shouldShareAgentLocation("How long does it take to get to the museum?"),
    ).toBe(true);
  });

  it("does not request GPS to compare routes between named places", () => {
    expect(
      shouldShareAgentLocation("¿Cómo llegar de Guaranda a Riobamba?"),
    ).toBe(false);
    expect(
      shouldShareAgentLocation(
        "¿Cuánto tiempo tarda desde el museo hasta el parque?",
      ),
    ).toBe(false);
  });

  it("distinguishes place names and visit durations from travel origins", () => {
    expect(
      shouldShareAgentLocation(
        "¿Cuánto tiempo tardo en llegar al museo de Guaranda a pie?",
      ),
    ).toBe(true);
    expect(
      shouldShareAgentLocation("How long from Guaranda to Riobamba?"),
    ).toBe(false);
    expect(shouldShareAgentLocation("How long has the museum been open?")).toBe(
      false,
    );
    expect(
      shouldShareAgentLocation("¿Cuánto tiempo tarda la visita al museo?"),
    ).toBe(false);
  });
});
