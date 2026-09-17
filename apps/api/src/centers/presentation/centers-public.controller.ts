import {
  BadRequestException,
  Controller,
  Get,
  Inject,
  NotFoundException,
  Param,
  Query,
} from "@nestjs/common";
import {
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiQuery,
  ApiTags,
} from "@nestjs/swagger";

import { GetPublishedCenterUseCase } from "../application/get-published-center.use-case";
import { GetDiscoveryCatalogUseCase } from "../application/get-discovery-catalog.use-case";
import { ListPublishedCentersUseCase } from "../application/list-published-centers.use-case";
import { listCentersQuerySchema } from "./centers.query";

@ApiTags("public-centers")
@Controller("centers")
export class CentersPublicController {
  constructor(
    @Inject(ListPublishedCentersUseCase)
    private readonly listPublishedCenters: ListPublishedCentersUseCase,
    @Inject(GetPublishedCenterUseCase)
    private readonly getPublishedCenter: GetPublishedCenterUseCase,
    @Inject(GetDiscoveryCatalogUseCase)
    private readonly getDiscoveryCatalog: GetDiscoveryCatalogUseCase,
  ) {}

  @Get()
  @ApiOkResponse({ description: "Centros turísticos publicados." })
  @ApiQuery({ name: "q", required: false, description: "Texto de búsqueda." })
  @ApiQuery({ name: "west", required: false })
  @ApiQuery({ name: "south", required: false })
  @ApiQuery({ name: "east", required: false })
  @ApiQuery({ name: "north", required: false })
  @ApiQuery({ name: "limit", required: false, example: 50 })
  async list(@Query() query: Record<string, unknown>) {
    const parsed = listCentersQuerySchema.safeParse(query);
    if (!parsed.success) {
      throw new BadRequestException(
        parsed.error.issues.map((issue) => issue.message).join(" "),
      );
    }
    const {
      q: text,
      west,
      south,
      east,
      north,
      limit,
      ...filters
    } = parsed.data;
    const page = await this.listPublishedCenters.execute({
      text,
      bounds:
        west === undefined
          ? undefined
          : { west, south: south!, east: east!, north: north! },
      ...filters,
      limit,
    });
    return { data: page.items, meta: { total: page.total, limit } };
  }

  @Get("catalogs/discovery")
  @ApiOkResponse({
    description: "Catálogos públicos para filtros de descubrimiento.",
  })
  async catalogs() {
    return { data: await this.getDiscoveryCatalog.execute() };
  }

  @Get(":code")
  @ApiOkResponse({ description: "Ficha pública simplificada de un centro." })
  @ApiNotFoundResponse({ description: "Centro no publicado o inexistente." })
  async getByCode(@Param("code") code: string) {
    const center = await this.getPublishedCenter.execute(code.trim());
    if (!center) {
      throw new NotFoundException(
        "No se encontró un centro turístico publicado con ese código.",
      );
    }
    return { data: center };
  }
}
