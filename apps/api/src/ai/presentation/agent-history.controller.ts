import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Put,
  UseGuards,
} from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import { z } from "zod";

import { CurrentUser, Roles } from "../../auth/auth.decorators";
import { AuthGuard } from "../../auth/auth.guard";
import type { AuthenticatedUser } from "../../auth/auth.types";
import { RolesGuard } from "../../auth/roles.guard";
import { AgentHistoryService } from "../application/agent-history.service";

const idSchema = z.uuid();
const preferenceSchema = z.object({ enabled: z.boolean() }).strict();

@ApiTags("ai-agent")
@ApiBearerAuth()
@UseGuards(AuthGuard, RolesGuard)
@Roles("TURISTA", "ADMINISTRADOR")
@Controller("ai/history")
export class AgentHistoryController {
  constructor(private readonly history: AgentHistoryService) {}

  @Get("preferences")
  async preferences(@CurrentUser() user: AuthenticatedUser) {
    return { data: { enabled: await this.history.enabled(user.id) } };
  }

  @Put("preferences")
  async updatePreferences(
    @Body() body: unknown,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    const parsed = preferenceSchema.safeParse(body);
    if (!parsed.success)
      throw new BadRequestException("La preferencia no es válida.");
    return {
      data: {
        enabled: await this.history.setEnabled(user.id, parsed.data.enabled),
      },
    };
  }

  @Get()
  async list(@CurrentUser() user: AuthenticatedUser) {
    return { data: await this.history.list(user.id) };
  }

  @Get(":id")
  async get(@Param("id") id: string, @CurrentUser() user: AuthenticatedUser) {
    return { data: await this.history.get(user.id, parseId(id)) };
  }

  @Delete(":id")
  async remove(
    @Param("id") id: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return { data: await this.history.remove(user.id, parseId(id)) };
  }
}

function parseId(value: string): string {
  const parsed = idSchema.safeParse(value);
  if (!parsed.success)
    throw new BadRequestException("La conversación no es válida.");
  return parsed.data;
}
