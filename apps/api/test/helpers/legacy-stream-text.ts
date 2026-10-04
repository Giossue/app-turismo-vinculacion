import { vi } from "vitest";

type LegacyResult = {
  output: Promise<{
    text: string;
    cards: readonly { ref: string }[];
    actions?: readonly unknown[];
  }>;
  partialOutputStream?: AsyncIterable<{ text?: string }>;
};

type ToolsOptions = {
  tools?: {
    showPlaceCards?: {
      execute?: (input: { refs: string[] }) => Promise<unknown>;
    };
  };
};

/**
 * Lets specs describe a model turn as the final text plus the cards it wants
 * shown, and replays it as the real stream: cards go through the
 * `showPlaceCards` tool and the answer is plain text.
 */
function adapt(options: ToolsOptions, legacy: LegacyResult) {
  const text = legacy.output.then(async (output) => {
    const refs = output.cards.map((card) => card.ref);
    if (refs.length > 0) {
      await options.tools?.showPlaceCards?.execute?.({ refs });
    }
    return output.text;
  });
  return {
    text,
    fullStream: (async function* () {
      yield { type: "start-step" };
      for await (const partial of legacy.partialOutputStream ?? []) {
        if (typeof partial.text === "string") {
          yield { type: "text-delta", id: "text", text: partial.text };
        }
      }
    })(),
  };
}

export function legacyStreamTextMock() {
  const mock = vi.fn();
  const implement = mock.mockImplementation.bind(mock);
  mock.mockImplementation = ((impl: (options: ToolsOptions) => LegacyResult) =>
    implement((options: ToolsOptions) =>
      adapt(options, impl(options)),
    )) as typeof mock.mockImplementation;
  return mock;
}
