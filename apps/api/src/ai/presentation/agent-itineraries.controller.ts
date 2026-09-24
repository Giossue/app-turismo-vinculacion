import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Put,
  UseGuards,
} from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import { z } from "zod";

import { CurrentUser, Roles } from "../../auth/auth.decorators";
import { AuthGuard } from "../../auth/auth.guard";
import type { AuthenticatedUser } from "../../auth/auth.types";
import { RolesGuard } from "../../auth/roles.guard";
import {
  AgentItinerariesService,
  savedItineraryInputSchema,
} from "../application/agent-itineraries.service";

const idSchema = z.uuid();

@ApiTags("ai-agent")
@ApiBearerAuth()
@UseGuards(AuthGuard, RolesGuard)
@Roles("TURISTA", "ADMINISTRADOR")
@Controller("ai/itineraries")
export class AgentItinerariesController {
  constructor(private readonly itineraries: AgentItinerariesService) {}

  @Get()
  async list(@CurrentUser() user: AuthenticatedUser) {
    return { data: await this.itineraries.list(user.id) };
  }

  @Get(":id")
  async get(@Param("id") id: string, @CurrentUser() user: AuthenticatedUser) {
    return { data: await this.itineraries.get(user.id, parseId(id)) };
  }

  @Post()
  async create(@Body() body: unknown, @CurrentUser() user: AuthenticatedUser) {
    return { data: await this.itineraries.create(user.id, parseBody(body)) };
  }

  @Put(":id")
  async update(
    @Param("id") id: string,
    @Body() body: unknown,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return {
      data: await this.itineraries.update(
        user.id,
        parseId(id),
        parseBody(body),
      ),
    };
  }

  @Delete(":id")
  async remove(
    @Param("id") id: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return { data: await this.itineraries.remove(user.id, parseId(id)) };
  }
}

function parseId(value: string): string {
  const result = idSchema.safeParse(value);
  if (!result.success)
    throw new BadRequestException("El identificador del plan no es válido.");
  return result.data;
}

function parseBody(value: unknown) {
  const result = savedItineraryInputSchema.safeParse(value);
  if (!result.success)
    throw new BadRequestException(
      "El plan debe tener jornadas y paradas válidas.",
    );
  return result.data;
}
