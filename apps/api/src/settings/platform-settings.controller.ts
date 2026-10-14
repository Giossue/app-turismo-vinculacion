import {
  Body,
  Controller,
  Get,
  Header,
  Inject,
  Patch,
  UseGuards,
} from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import { IsBoolean, IsOptional } from "class-validator";

import { CurrentUser, Roles } from "../auth/auth.decorators";
import { AuthGuard } from "../auth/auth.guard";
import { RolesGuard } from "../auth/roles.guard";
import type { AuthenticatedUser } from "../auth/auth.types";
import { PlatformSettingsService } from "./platform-settings.service";

export class UpdatePlatformSettingsDto {
  @IsOptional()
  @IsBoolean()
  directPublishCatastros?: boolean;

  @IsOptional()
  @IsBoolean()
  directPublishFichas?: boolean;
}

@ApiTags("admin-settings")
@ApiBearerAuth()
@Controller("admin/settings")
@UseGuards(AuthGuard, RolesGuard)
export class PlatformSettingsController {
  constructor(
    @Inject(PlatformSettingsService)
    private readonly settings: PlatformSettingsService,
  ) {}

  /** Lo consultan también los agentes: el panel ajusta «Enviar» o «Publicar». */
  @Get()
  @Header("Cache-Control", "private, no-store")
  @Roles("ADMINISTRADOR", "AGENTE_TURISTICO")
  async get() {
    return { data: await this.settings.get() };
  }

  @Patch()
  @Roles("ADMINISTRADOR")
  async update(
    @Body() body: UpdatePlatformSettingsDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return { data: await this.settings.update(body, user.id) };
  }
}
