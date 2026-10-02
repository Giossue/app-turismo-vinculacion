import { Controller, Get, Header, Inject } from "@nestjs/common";
import {
  ApiOkResponse,
  ApiServiceUnavailableResponse,
  ApiTags,
} from "@nestjs/swagger";

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
  @Header("Cache-Control", `public, max-age=${OFFLINE_MAP_STYLE_CACHE_SECONDS}`)
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
  getStyle() {
    // MapLibre expects the style itself, rather than the API's { data } envelope.
    return this.styles.getStyle();
  }
}
