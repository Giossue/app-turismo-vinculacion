import { describe, expect, it, vi } from "vitest";

import { AdminCentersService } from "../src/admin/admin-centers.service";

type Draft = {
  subtypeId: number;
  activities?: Array<{ activityId: number; active: boolean }>;
  accessibility?: Array<{ typeId: number; applies: boolean }>;
  facilities?: Array<{ typeId: number; quantity: number }>;
  sections?: Record<string, unknown>;
};

function validationFixture() {
  const query = vi.fn(async (sql: string, parameters: unknown[]) => {
    const selected = Array.isArray(parameters[0])
      ? (parameters[0] as number[])
      : [Number(parameters[0])];
    const retained = (
      sql.includes("FROM actividades_turisticas at")
        ? parameters[2]
        : parameters[1]
    ) as number[] | undefined;
    return selected
      .filter((id) => retained?.includes(id))
      .map((id) => ({ id: String(id) }));
  });
  const service = new AdminCentersService({} as never);
  const validate = (
    service as unknown as {
      validateTechnicalSections: (
        manager: { query: typeof query },
        draft: Draft,
        publication: boolean,
        centerId: string,
        previous?: Draft,
      ) => Promise<void>;
    }
  ).validateTechnicalSections.bind(service);
  return {
    query,
    validate: (draft: Draft, previous?: Draft, publication = false) =>
      validate({ query }, draft, publication, "10", previous),
  };
}

describe("retained center catalog references", () => {
  const historical: Draft = {
    subtypeId: 1,
    activities: [{ activityId: 10, active: true }],
    accessibility: [{ typeId: 20, applies: true }],
    facilities: [{ typeId: 30, quantity: 1 }],
    sections: {
      planta: { facilitiesDetails: [{ typeId: 30, quantity: 1 }] },
      accesibilidad: {
        accessibilityDetails: {
          criteria: [
            { criterionId: 40, accessibilityTypeId: 20, response: "SI" },
          ],
        },
      },
    },
  };

  it.each([false, true])(
    "preserves retired references during publication=%s",
    async (publication) => {
      const { query, validate } = validationFixture();
      await expect(
        validate(historical, historical, publication),
      ).resolves.toBeUndefined();
      expect(query).toHaveBeenCalledWith(
        expect.stringContaining("at.eliminado_at IS NULL"),
        [[10], 1, [10]],
      );
      expect(query).toHaveBeenCalledWith(
        expect.stringContaining("FROM tipos_accesibilidad"),
        [[20], [20]],
      );
      expect(query).toHaveBeenCalledWith(
        expect.stringContaining("accessibility.eliminado_at IS NULL"),
        [[40], [40]],
      );
    },
  );

  it.each([
    { subtypeId: 1, activities: historical.activities },
    { subtypeId: 1, accessibility: historical.accessibility },
    { subtypeId: 1, facilities: historical.facilities },
    { subtypeId: 1, sections: { planta: historical.sections!.planta } },
    {
      subtypeId: 1,
      sections: { accesibilidad: historical.sections!.accesibilidad },
    },
  ])(
    "rejects assigning a retired option that was absent from the previous snapshot: %j",
    async (draft) => {
      const { validate } = validationFixture();
      await expect(validate(draft, { subtypeId: 1 })).rejects.toThrow(
        "no está disponible",
      );
    },
  );

  it("allows dropping historical references and then prevents assigning them again", async () => {
    const { validate } = validationFixture();
    const empty: Draft = {
      subtypeId: 1,
      activities: [],
      accessibility: [],
      facilities: [],
      sections: {},
    };
    await expect(validate(empty, historical)).resolves.toBeUndefined();
    await expect(validate(historical, empty)).rejects.toThrow(
      "no está disponible",
    );
  });
});
