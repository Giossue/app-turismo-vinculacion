import { ConfigService } from "@nestjs/config";
import { describe, expect, it } from "vitest";

import { AiAgentService } from "../src/ai/application/ai-agent.service";
import type { PublicCenterRepository } from "../src/centers/application/public-center.repository";

function repository(): PublicCenterRepository {
  return {
    getDiscoveryCatalog: async () => ({
      categories: [],
      types: [],
      subtypes: [],
      provinces: [],
      cantons: [],
      parishes: [],
      hierarchies: [],
    }),
    findPublishedByCode: async () => null,
    listPublished: async () => ({ items: [], total: 0 }),
  };
}

describe("AiAgentService", () => {
  it("fails closed when the selected provider has no key", () => {
    const service = new AiAgentService(
      new ConfigService({ AI_PROVIDER: "openai", AI_MODEL: "gpt-5-mini" }),
      repository(),
    );

    expect(() =>
      service.stream({ message: "Busca un mirador", history: [] }),
    ).toThrow("El proveedor de IA no está configurado.");
  });

  it.each([
    ["openai", "OPENAI_API_KEY", "gpt-5-mini"],
    ["anthropic", "ANTHROPIC_API_KEY", "claude-sonnet-4-5"],
  ] as const)(
    "creates a stream for %s without leaking provider configuration",
    (provider, key, model) => {
      const service = new AiAgentService(
        new ConfigService({
          AI_PROVIDER: provider,
          AI_MODEL: model,
          [key]: "test-key",
        }),
        repository(),
      );

      expect(() =>
        service.stream({ message: "Busca un mirador", history: [] }),
      ).not.toThrow();
    },
  );
});
