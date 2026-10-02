import {
  Controller,
  Get,
  Inject,
  NotFoundException,
  Param,
  ServiceUnavailableException,
} from "@nestjs/common";
import {
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiServiceUnavailableResponse,
  ApiTags,
} from "@nestjs/swagger";

import { GetOfflineCityManifestUseCase } from "../application/get-offline-city-manifest.use-case";
import { ListOfflineCitiesUseCase } from "../application/list-offline-cities.use-case";
import { OfflineCityAreaUnavailableError } from "../domain/offline-city";
import { offlineManifestResponseSchema } from "./offline-manifest.schema";

@ApiTags("offline")
@Controller("offline/cities")
export class OfflineController {
  constructor(
    @Inject(ListOfflineCitiesUseCase)
    private readonly listOfflineCities: ListOfflineCitiesUseCase,
    @Inject(GetOfflineCityManifestUseCase)
    private readonly getOfflineCityManifest: GetOfflineCityManifestUseCase,
  ) {}

  @Get()
  @ApiOkResponse({ description: "Ciudades y estado de su paquete offline." })
  async list() {
    return { data: await this.listOfflineCities.execute() };
  }

  @Get(":slug/manifest")
  @ApiOkResponse({
    description:
      "Paquete público de ciudad: cobertura, atractivos, catastros, POIs y rutas publicadas.",
    schema: offlineManifestResponseSchema,
  })
  @ApiNotFoundResponse({ description: "La ciudad no tiene paquete publicado." })
  @ApiServiceUnavailableResponse({
    description: "La ciudad no tiene una zona de descarga definida.",
  })
  async manifest(@Param("slug") slug: string) {
    const value = await this.getOfflineCityManifest
      .execute(slug.trim())
      .catch((error: unknown) => {
        if (error instanceof OfflineCityAreaUnavailableError) {
          throw new ServiceUnavailableException(error.message);
        }
        throw error;
      });
    if (!value) {
      throw new NotFoundException(
        "La ciudad no tiene un paquete offline publicado.",
      );
    }
    return { data: value };
  }
}
