import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";

import { CurrentUser, Roles } from "../auth/auth.decorators";
import { AuthGuard } from "../auth/auth.guard";
import type { AuthenticatedUser } from "../auth/auth.types";
import { RolesGuard } from "../auth/roles.guard";
import {
  OpinionContentDto,
  OpinionsQueryDto,
  ReviewOpinionDto,
} from "./opinions.dto";
import { OpinionsService } from "./opinions.service";

@ApiTags("opinions")
@Controller("centers/:code/opinions")
export class PublicOpinionsController {
  constructor(private readonly opinions: OpinionsService) {}

  @Get()
  async list(@Param("code") code: string, @Query() query: OpinionsQueryDto) {
    return {
      data: await this.opinions.listPublished(code, query.limit, query.offset),
    };
  }
}

@ApiTags("opinions")
@ApiBearerAuth()
@Controller("opinions")
@UseGuards(AuthGuard, RolesGuard)
export class OpinionsController {
  constructor(private readonly opinions: OpinionsService) {}

  @Get("me/centers/:code")
  @Roles("TURISTA", "ADMINISTRADOR")
  async mine(
    @Param("code") code: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return { data: await this.opinions.getOwn(code, user.id) };
  }

  @Post("centers/:code")
  @Roles("TURISTA", "ADMINISTRADOR")
  async create(
    @Param("code") code: string,
    @Body() body: OpinionContentDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return { data: await this.opinions.create(code, user.id, body) };
  }

  @Patch("centers/:code")
  @Roles("TURISTA", "ADMINISTRADOR")
  async edit(
    @Param("code") code: string,
    @Body() body: OpinionContentDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return { data: await this.opinions.edit(code, user.id, body) };
  }
}

@ApiTags("admin-opinions")
@ApiBearerAuth()
@Controller("admin/opinions")
@UseGuards(AuthGuard, RolesGuard)
export class AdminOpinionsController {
  constructor(private readonly opinions: OpinionsService) {}

  @Get()
  @Roles("ADMINISTRADOR")
  async list(@Query() query: OpinionsQueryDto) {
    return {
      data: await this.opinions.listAdmin(query.limit, query.offset),
    };
  }

  @Get(":reviewCode/history")
  @Roles("ADMINISTRADOR")
  async history(@Param("reviewCode") reviewCode: string) {
    return {
      data: await this.opinions.getAdminHistory(reviewCode),
    };
  }

  @Patch(":reviewCode")
  @Roles("ADMINISTRADOR")
  async review(
    @Param("reviewCode") reviewCode: string,
    @Body() body: ReviewOpinionDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return {
      data: await this.opinions.review(
        reviewCode,
        user.id,
        body.action,
        body.reason,
      ),
    };
  }
}
