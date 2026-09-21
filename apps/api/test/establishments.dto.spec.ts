import "reflect-metadata";

import { plainToInstance } from "class-transformer";
import { validate } from "class-validator";
import { describe, expect, it } from "vitest";

import { CreateEstablishmentDto } from "../src/establishments/establishments.dto";

describe("CreateEstablishmentDto", () => {
  it("rejects a create payload without both coordinates", async () => {
    const errors = await validate(
      plainToInstance(CreateEstablishmentDto, {
        localityId: 1,
        nombreComercial: "Comedor de prueba",
        actividad: "Alimentación",
      }),
    );

    expect(errors.map((error) => error.property)).toEqual(
      expect.arrayContaining(["latitude", "longitude"]),
    );
  });

  it("transforms and accepts valid coordinate values", async () => {
    const errors = await validate(
      plainToInstance(CreateEstablishmentDto, {
        localityId: "1",
        nombreComercial: "Comedor de prueba",
        actividad: "Alimentación",
        latitude: "-1.59263",
        longitude: "-79.00098",
      }),
    );

    expect(errors).toHaveLength(0);
  });
});
