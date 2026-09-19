import {
  BadRequestException,
  Body,
  Controller,
  Inject,
  Post,
  ServiceUnavailableException,
  UnprocessableEntityException,
} from "@nestjs/common";
import {
  ApiBadRequestResponse,
  ApiBody,
  ApiOkResponse,
  ApiServiceUnavailableResponse,
  ApiTags,
  ApiUnprocessableEntityResponse,
} from "@nestjs/swagger";

import { CalculateRouteUseCase } from "../application/calculate-route.use-case";
import {
  NoRouteFoundError,
  RouteProviderUnavailableError,
} from "../domain/routing-errors";
import { routeRequestSchema } from "./route.schema";

@ApiTags("routing")
@Controller("routing")
export class RoutingController {
  constructor(
    @Inject(CalculateRouteUseCase)
    private readonly calculateRoute: CalculateRouteUseCase,
  ) {}

  @Post("route")
  @ApiBody({
    schema: {
      type: "object",
      required: ["mode", "origin", "destination"],
      properties: {
        mode: { type: "string", enum: ["car", "bicycle", "foot"] },
        origin: {
          type: "object",
          required: ["latitude", "longitude"],
          properties: {
            latitude: { type: "number", format: "double" },
            longitude: { type: "number", format: "double" },
          },
        },
        destination: {
          type: "object",
          required: ["latitude", "longitude"],
          properties: {
            latitude: { type: "number", format: "double" },
            longitude: { type: "number", format: "double" },
          },
        },
      },
    },
  })
  @ApiOkResponse({ description: "Ruta calculada sin tráfico en tiempo real." })
  @ApiBadRequestResponse({ description: "Origen, destino o modo inválido." })
  @ApiUnprocessableEntityResponse({
    description: "No existe una ruta posible.",
  })
  @ApiServiceUnavailableResponse({
    description: "El proveedor de rutas no responde.",
  })
  async route(@Body() body: unknown) {
    const parsed = routeRequestSchema.safeParse(body);
    if (!parsed.success) {
      throw new BadRequestException(
        parsed.error.issues.map((issue) => issue.message).join(" "),
      );
    }

    try {
      return { data: await this.calculateRoute.execute(parsed.data) };
    } catch (error) {
      if (error instanceof NoRouteFoundError) {
        throw new UnprocessableEntityException(error.message);
      }
      if (error instanceof RouteProviderUnavailableError) {
        throw new ServiceUnavailableException(error.message);
      }
      throw error;
    }
  }
}
