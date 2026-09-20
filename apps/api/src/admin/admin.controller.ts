import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Inject,
  UseGuards,
} from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";

import { AdminCentersService } from "./admin-centers.service";
import {
  AdminCentersQueryDto,
  AdminCatalogsQueryDto,
  AdminCatalogUpdateDto,
  ADMIN_CENTER_SECTION_CODES,
  ReviewCenterDto,
  SaveAdminSectionDto,
  SaveAdminCenterDto,
} from "./admin.dto";
import { CurrentUser, Roles } from "../auth/auth.decorators";
import { AuthGuard } from "../auth/auth.guard";
import { RolesGuard } from "../auth/roles.guard";
import type { AuthenticatedUser } from "../auth/auth.types";

@ApiTags("admin-centers")
@ApiBearerAuth()
@Controller("admin")
@UseGuards(AuthGuard, RolesGuard)
export class AdminController {
  constructor(
    @Inject(AdminCentersService) private readonly centers: AdminCentersService,
  ) {}

  @Get("centers")
  @Roles("ADMINISTRADOR")
  async list(@Query() query: AdminCentersQueryDto) {
    return { data: await this.centers.list(query) };
  }

  @Get("summary")
  @Roles("ADMINISTRADOR")
  async summary() {
    return { data: await this.centers.summary() };
  }

  @Get("catalogs")
  @Roles("ADMINISTRADOR")
  async catalogs(@Query() query: AdminCatalogsQueryDto) {
    return { data: await this.centers.catalogs(query) };
  }

  @Get("centers/:code")
  @Roles("ADMINISTRADOR")
  async find(@Param("code") code: string) {
    return { data: await this.centers.find(code) };
  }

  @Get("centers/:code/sections")
  @Roles("ADMINISTRADOR")
  async sections(@Param("code") code: string) {
    return { data: await this.centers.sections(code) };
  }

  @Get("centers/:code/valuation")
  @Roles("ADMINISTRADOR")
  async valuation(@Param("code") code: string) {
    return { data: await this.centers.valuation(code) };
  }

  @Patch("centers/:code/sections/:sectionCode")
  @Roles("ADMINISTRADOR")
  async saveSection(
    @Param("code") code: string,
    @Param("sectionCode") sectionCode: string,
    @Body() body: SaveAdminSectionDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    if (
      !ADMIN_CENTER_SECTION_CODES.includes(
        sectionCode as (typeof ADMIN_CENTER_SECTION_CODES)[number],
      )
    ) {
      throw new BadRequestException("La sección de ficha no está disponible.");
    }
    return {
      data: await this.centers.saveSection(
        code,
        sectionCode as (typeof ADMIN_CENTER_SECTION_CODES)[number],
        user.id,
        body,
      ),
    };
  }

  @Patch("catalogs/:catalog/:id")
  @Roles("ADMINISTRADOR")
  async updateCatalog(
    @Param("catalog") catalog: string,
    @Param("id") id: string,
    @Body() body: AdminCatalogUpdateDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    const numericId = Number(id);
    if (!Number.isInteger(numericId) || numericId < 1) {
      throw new BadRequestException(
        "El identificador del catálogo no es válido.",
      );
    }
    return {
      data: await this.centers.updateCatalog(user.id, catalog, numericId, body),
    };
  }

  @Post("centers")
  @Roles("ADMINISTRADOR")
  async create(
    @Body() body: SaveAdminCenterDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return { data: await this.centers.create(user.id, body) };
  }

  @Patch("centers/:code")
  @Roles("ADMINISTRADOR")
  async save(
    @Param("code") code: string,
    @Body() body: SaveAdminCenterDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return { data: await this.centers.save(code, user.id, body) };
  }

  @Post("centers/:code/submit-review")
  @Roles("ADMINISTRADOR")
  async submitReview(
    @Param("code") code: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return { data: await this.centers.submitReview(code, user.id) };
  }

  @Patch("centers/:code/review")
  @Roles("ADMINISTRADOR")
  async review(
    @Param("code") code: string,
    @Body() body: ReviewCenterDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return { data: await this.centers.review(code, user.id, body) };
  }

  @Post("centers/:code/publish")
  @Roles("ADMINISTRADOR")
  async publish(
    @Param("code") code: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return { data: await this.centers.publish(code, user.id) };
  }

  @Post("centers/:code/deactivate")
  @Roles("ADMINISTRADOR")
  async deactivate(
    @Param("code") code: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return { data: await this.centers.deactivate(code, user.id) };
  }

  @Post("centers/:code/reactivate")
  @Roles("ADMINISTRADOR")
  async reactivate(
    @Param("code") code: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return { data: await this.centers.reactivate(code, user.id) };
  }

  @Get("centers/:code/audit")
  @Roles("ADMINISTRADOR")
  async audit(@Param("code") code: string) {
    return { data: await this.centers.getAudit(code) };
  }
}
