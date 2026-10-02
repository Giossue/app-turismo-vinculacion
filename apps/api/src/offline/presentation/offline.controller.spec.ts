import { NotFoundException, ServiceUnavailableException } from "@nestjs/common";
import { describe, expect, it, vi } from "vitest";

import { OfflineCityAreaUnavailableError } from "../domain/offline-city";
import { OfflineController } from "./offline.controller";

describe("offline manifest HTTP boundary", () => {
  it("reports missing coverage as unavailable instead of serving a different city", async () => {
    const controller = new OfflineController(
      { execute: vi.fn() } as never,
      {
        execute: vi
          .fn()
          .mockRejectedValue(new OfflineCityAreaUnavailableError()),
      } as never,
    );
    await expect(controller.manifest("unknown-area")).rejects.toThrow(
      ServiceUnavailableException,
    );
    await expect(controller.manifest("unknown-area")).rejects.toThrow(
      "La ciudad no tiene una zona de descarga definida.",
    );
  });

  it("does not turn unrelated database failures into a coverage error", async () => {
    const failure = new Error("Database unavailable");
    const controller = new OfflineController(
      { execute: vi.fn() } as never,
      { execute: vi.fn().mockRejectedValue(failure) } as never,
    );
    await expect(controller.manifest("guaranda")).rejects.toBe(failure);
  });

  it("preserves the not-found response for unpublished packages", async () => {
    const controller = new OfflineController(
      { execute: vi.fn() } as never,
      { execute: vi.fn().mockResolvedValue(null) } as never,
    );
    await expect(controller.manifest("guaranda")).rejects.toThrow(
      NotFoundException,
    );
  });
});
