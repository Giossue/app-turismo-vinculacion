import { describe, expect, it } from "vitest";

import { agentResponseSchema } from "./agent";

const centerCard = {
  type: "center",
  code: "GUA-001",
  name: "Centro Cultural Indio Guaranga",
  summary: "Descripción oficial",
  category: "Manifestaciones culturales",
  latitude: -1.59,
  longitude: -79,
  distanceMeters: null,
};

describe("agent center card locations", () => {
  it.each([
    { label: "older response", fields: {} },
    {
      label: "published location",
      fields: { address: "Calle Sucre", localityName: "Guaranda" },
    },
    {
      label: "unpublished location",
      fields: { address: null, localityName: null },
    },
  ])("accepts a $label", ({ fields }) => {
    const response = {
      text: "Lugar publicado",
      cards: [{ ...centerCard, ...fields }],
      actions: [],
      sources: [],
    };
    expect(agentResponseSchema.parse(response)).toEqual(response);
  });

  it.each([
    { address: 123, localityName: "Guaranda" },
    { address: null, localityName: "" },
  ])("rejects a malformed center location", (fields) => {
    expect(
      agentResponseSchema.safeParse({
        text: "Lugar publicado",
        cards: [{ ...centerCard, ...fields }],
        actions: [],
        sources: [],
      }).success,
    ).toBe(false);
  });
});
