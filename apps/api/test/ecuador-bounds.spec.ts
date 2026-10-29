import { BadRequestException } from "@nestjs/common";
import { plainToInstance } from "class-transformer";
import { validate } from "class-validator";
import { describe, expect, it } from "vitest";

import { SaveAdminCenterDto } from "../src/admin/admin.dto";
import {
  ECUADOR_COORDINATES_MESSAGE,
  isInsideEcuador,
} from "../src/common/ecuador-bounds";
import { EstablishmentsService } from "../src/establishments/establishments.service";

describe("Ecuador coordinate bounds", () => {
  it("accepts mainland and Galápagos points and rejects the ocean", () => {
    expect(isInsideEcuador(-1.59092, -78.998689)).toBe(true);
    expect(isInsideEcuador(-0.74, -90.31)).toBe(true);
    // FOLK y MARISQUERIA 7 ANCLAS estaban así en producción.
    expect(isInsideEcuador(-1.59092, -100.998689)).toBe(false);
    expect(isInsideEcuador(-1.58294, -97.006006)).toBe(false);
    expect(isInsideEcuador(40.4, -3.7)).toBe(false);
  });

  it("rejects a manually saved establishment outside Ecuador", () => {
    const service = new EstablishmentsService({} as never);
    const require = (
      service as unknown as {
        requireCreateFields: (input: unknown) => unknown;
      }
    ).requireCreateFields.bind(service);
    const base = {
      localityId: 1,
      nombreComercial: "FOLK",
      actividad: "ALIMENTOS",
    };

    expect(() =>
      require({ ...base, latitude: -1.59092, longitude: -100.998689 }),
    ).toThrow(new BadRequestException(ECUADOR_COORDINATES_MESSAGE));
    expect(
      require({ ...base, latitude: -1.59092, longitude: -78.998689 }),
    ).toMatchObject({ longitude: -78.998689 });
  });

  it("rejects a center whose coordinates fall outside Ecuador", async () => {
    const errors = await validate(
      plainToInstance(SaveAdminCenterDto, {
        latitude: -1.59,
        longitude: -100.99,
      }),
    );
    const failing = errors
      .filter((error) => error.property === "longitude")
      .flatMap((error) => Object.values(error.constraints ?? {}));
    expect(failing).toContain(ECUADOR_COORDINATES_MESSAGE);
    expect(errors.some((error) => error.property === "latitude")).toBe(false);
  });
});
