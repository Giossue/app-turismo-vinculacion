import { describe, expect, it } from "vitest";

import { getRetryableAgentTurn } from "../domain/agent-conversation";
import { closeInterruptedAnswer } from "./agent-conversation-storage";

describe("closeInterruptedAnswer", () => {
  it("turns a streaming answer into a retryable error", () => {
    const closed = closeInterruptedAnswer([
      { id: "user-1", role: "user", text: "¿Dónde comer?" },
      { id: "assistant-2", kind: "partial", role: "assistant", text: "Puedes" },
    ]);
    expect(closed.at(-1)).toMatchObject({ id: "assistant-2", kind: "error" });
    expect(getRetryableAgentTurn(closed)).toEqual({
      question: "¿Dónde comer?",
      answerId: "assistant-2",
    });
  });

  it("adds a retryable answer to a question that never got one", () => {
    const closed = closeInterruptedAnswer([
      { id: "user-1", role: "user", text: "Hola" },
    ]);
    expect(getRetryableAgentTurn(closed)?.question).toBe("Hola");
  });

  it("keeps finished conversations unchanged", () => {
    const messages = [
      { id: "user-1", role: "user", text: "Hola" },
      { id: "assistant-2", role: "assistant", text: "¡Hola!" },
    ] as const;
    expect(closeInterruptedAnswer(messages)).toEqual(messages);
  });
});
