import { Controller, Get, Query } from "@nestjs/common";
import { ApiOkResponse, ApiQuery, ApiTags } from "@nestjs/swagger";

import { PublicSearchQueryDto } from "./search.dto";
import { SearchService } from "./search.service";

@ApiTags("public-search")
@Controller("search")
export class SearchController {
  constructor(private readonly search: SearchService) {}

  @Get()
  @ApiOkResponse({
    description:
      "Centros publicados, catastro y referencias geográficas de Ecuador, ordenados por relevancia y luego cercanía. distanceMeters es distancia en línea recta al punto opcional.",
  })
  @ApiQuery({ name: "q", required: true, minLength: 2 })
  @ApiQuery({
    name: "kind",
    required: false,
    enum: ["center", "establishment", "geographic"],
  })
  @ApiQuery({
    name: "latitude",
    required: false,
    type: Number,
    description: "Latitud del punto para priorizar; requiere longitude.",
  })
  @ApiQuery({
    name: "longitude",
    required: false,
    type: Number,
    description: "Longitud del punto para priorizar; requiere latitude.",
  })
  @ApiQuery({
    name: "west",
    required: false,
    type: Number,
    description: "Límite oeste. Los cuatro límites se envían juntos.",
  })
  @ApiQuery({ name: "south", required: false, type: Number })
  @ApiQuery({ name: "east", required: false, type: Number })
  @ApiQuery({ name: "north", required: false, type: Number })
  async query(@Query() query: PublicSearchQueryDto) {
    return { data: await this.search.search(query) };
  }
}
