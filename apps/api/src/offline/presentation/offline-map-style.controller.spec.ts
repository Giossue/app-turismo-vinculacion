import { ServiceUnavailableException } from "@nestjs/common";
import { describe, expect, it, vi } from "vitest";

import { OfflineMapStyleController } from "./offline-map-style.controller";

describe("native offline style response", () => {
  it("serves the raw GL style with a cache policy for the renderer and downloader", async () => {
    const style = { version: 8, sources: {}, layers: [] };
    const controller = new OfflineMapStyleController({
      getStyle: vi.fn().mockResolvedValue(style),
    } as never);
    const response = { header: vi.fn() };
    await expect(controller.getStyle(response as never)).resolves.toBe(style);
    expect(response.header).toHaveBeenCalledWith(
      "Cache-Control",
      "public, max-age=1800",
    );
  });

  it("does not apply the successful cache lifetime to a temporary upstream failure", async () => {
    const controller = new OfflineMapStyleController({
      getStyle: vi.fn().mockRejectedValue(new ServiceUnavailableException()),
    } as never);
    const response = { header: vi.fn() };
    await expect(controller.getStyle(response as never)).rejects.toThrow(
      ServiceUnavailableException,
    );
    expect(response.header).not.toHaveBeenCalled();
  });
});
