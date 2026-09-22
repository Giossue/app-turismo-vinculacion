import { Controller, Get, Query } from "@nestjs/common";
import { ApiOkResponse, ApiQuery, ApiTags } from "@nestjs/swagger";

import { PublicSearchQueryDto } from "./search.dto";
import { SearchService } from "./search.service";

@ApiTags("public-search")
@Controller("search")
export class SearchController {
  constructor(private readonly search: SearchService) {}

  @Get()
  @ApiOkResponse({ description: "Lugares propios y referencias geográficas de Ecuador." })
  @ApiQuery({ name: "q", required: true, minLength: 2 })
  async query(@Query() query: PublicSearchQueryDto) {
    return { data: await this.search.search(query) };
  }
}
