import { Controller, Get, Inject, Res } from "@nestjs/common";
import {
  ApiOkResponse,
  ApiServiceUnavailableResponse,
  ApiTags,
} from "@nestjs/swagger";
import type { FastifyReply } from "fastify";

import {
  OFFLINE_MAP_STYLE_CACHE_SECONDS,
  OfflineMapStyleService,
} from "../infrastructure/offline-map-style.service";

@ApiTags("offline")
@Controller("offline/map-style")
export class OfflineMapStyleController {
  constructor(
    @Inject(OfflineMapStyleService)
    private readonly styles: OfflineMapStyleService,
  ) {}

  @Get()
  @ApiOkResponse({
    description:
      "Estilo MapLibre GL v8 normalizado, JSON crudo para el descargador nativo.",
    schema: {
      type: "object",
      required: ["version", "sources", "layers"],
      additionalProperties: true,
      properties: {
        version: { type: "integer", enum: [8] },
        sources: { type: "object", additionalProperties: true },
        layers: {
          type: "array",
          items: { type: "object", additionalProperties: true },
        },
        glyphs: { type: "string" },
        sprite: {
          oneOf: [
            { type: "string" },
            {
              type: "array",
              items: { type: "object", additionalProperties: true },
            },
          ],
        },
      },
    },
  })
  @ApiServiceUnavailableResponse({
    description: "El estilo no está configurado o no se puede descargar.",
  })
  async getStyle(@Res({ passthrough: true }) response: FastifyReply) {
    // MapLibre expects the style itself, rather than the API's { data } envelope.
    const style = await this.styles.getStyle();
    // Do not cache a temporary 503 response for the successful style's lifetime.
    response.header(
      "Cache-Control",
      `public, max-age=${OFFLINE_MAP_STYLE_CACHE_SECONDS}`,
    );
    return style;
  }
}
