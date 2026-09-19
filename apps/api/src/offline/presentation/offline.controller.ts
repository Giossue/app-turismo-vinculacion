import {
  Controller,
  Get,
  Inject,
  NotFoundException,
  Param,
} from "@nestjs/common";
import { ApiNotFoundResponse, ApiOkResponse, ApiTags } from "@nestjs/swagger";

import { GetOfflineCityManifestUseCase } from "../application/get-offline-city-manifest.use-case";
import { ListOfflineCitiesUseCase } from "../application/list-offline-cities.use-case";

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
  @ApiOkResponse({ description: "Manifiesto público de una ciudad." })
  @ApiNotFoundResponse({ description: "La ciudad no tiene paquete publicado." })
  async manifest(@Param("slug") slug: string) {
    const value = await this.getOfflineCityManifest.execute(slug.trim());
    if (!value) {
      throw new NotFoundException(
        "La ciudad no tiene un paquete offline publicado.",
      );
    }
    return { data: value };
  }
}
