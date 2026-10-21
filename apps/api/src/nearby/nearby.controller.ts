import {
  BadRequestException,
  Controller,
  Get,
  Inject,
  Query,
} from "@nestjs/common";
import { ApiOkResponse, ApiQuery, ApiTags } from "@nestjs/swagger";

import {
  nearbyDefaultLimit,
  nearbyDefaultRadiusMeters,
  nearbyFilters,
  nearbyMaxLimit,
  nearbyMaxRadiusMeters,
  nearbyQuerySchema,
} from "./nearby.query";
import { NearbyService } from "./nearby.service";

@ApiTags("public-nearby")
@Controller("nearby")
export class NearbyController {
  constructor(@Inject(NearbyService) private readonly nearby: NearbyService) {}

  @Get()
  @ApiOkResponse({
    description:
      "Centros y catastro publicados dentro del radio, del más cercano al más lejano. distanceMeters es distancia en línea recta.",
  })
  @ApiQuery({ name: "latitude", required: true, type: Number })
  @ApiQuery({ name: "longitude", required: true, type: Number })
  @ApiQuery({
    name: "radiusMeters",
    required: false,
    schema: {
      type: "integer",
      minimum: 100,
      maximum: nearbyMaxRadiusMeters,
      default: nearbyDefaultRadiusMeters,
    },
  })
  @ApiQuery({ name: "filter", required: false, enum: nearbyFilters })
  @ApiQuery({
    name: "limit",
    required: false,
    schema: {
      type: "integer",
      minimum: 1,
      maximum: nearbyMaxLimit,
      default: nearbyDefaultLimit,
    },
  })
  async list(@Query() query: Record<string, unknown>) {
    const parsed = nearbyQuerySchema.safeParse(query);
    if (!parsed.success) {
      throw new BadRequestException(
        "Indica una ubicación válida, un radio de hasta 20 km y un filtro conocido.",
      );
    }
    return { data: { items: await this.nearby.list(parsed.data) } };
  }
}
