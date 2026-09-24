import {
  BadRequestException,
  Body,
  Controller,
  Inject,
  Param,
  Post,
  UseGuards,
} from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import { RouteConfig } from "@nestjs/platform-fastify";

import { CurrentUser, Roles } from "../../auth/auth.decorators";
import { AuthGuard } from "../../auth/auth.guard";
import type { AuthenticatedUser } from "../../auth/auth.types";
import { RolesGuard } from "../../auth/roles.guard";
import {
  AgentEditorialService,
  editorialInputSchema,
} from "../application/agent-editorial.service";

@ApiTags("ai-agent-editorial")
@ApiBearerAuth()
@UseGuards(AuthGuard, RolesGuard)
@Roles("ADMINISTRADOR", "AGENTE_TURISTICO")
@Controller("admin/ai")
export class AgentEditorialController {
  constructor(
    @Inject(AgentEditorialService)
    private readonly editorial: AgentEditorialService,
  ) {}

  @Post("centers/:code/description")
  @RouteConfig({ rateLimit: { max: 10, timeWindow: "1 minute" } })
  async assist(
    @Param("code") code: string,
    @Body() body: unknown,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    const parsed = editorialInputSchema.safeParse(body);
    if (!parsed.success)
      throw new BadRequestException(
        "La descripción debe tener entre 20 y 500 caracteres.",
      );
    return {
      data: await this.editorial.assist(
        code,
        user.id,
        user.roles.includes("ADMINISTRADOR"),
        parsed.data,
      ),
    };
  }
}
