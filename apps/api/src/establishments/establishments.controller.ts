import {
  BadRequestException,
  NotFoundException,
  Body,
  Controller,
  Delete,
  Get,
  Inject,
  Optional,
  Param,
  Patch,
  Post,
  Query,
  Req,
  Res,
  UseGuards,
} from "@nestjs/common";
import { RouteConfig } from "@nestjs/platform-fastify";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import type { FastifyReply, FastifyRequest } from "fastify";

import { CurrentUser, Roles } from "../auth/auth.decorators";
import { AuthGuard } from "../auth/auth.guard";
import { RolesGuard } from "../auth/roles.guard";
import type { AuthenticatedUser } from "../auth/auth.types";
import {
  AdminEstablishmentsQueryDto,
  CreateEstablishmentDto,
  EstablishmentTileParamsDto,
  PublicEstablishmentsQueryDto,
  ReviewEstablishmentDto,
  SaveEstablishmentDto,
} from "./establishments.dto";
import { EstablishmentsService } from "./establishments.service";
import { PlatformSettingsService } from "../settings/platform-settings.service";
import { APP_DOWNLOAD_URL, renderDownloadPage } from "./download-page";
import {
  renderEstablishmentNotFound,
  renderEstablishmentPage,
} from "./establishment-page";
import { MinturRegistryImportService } from "./mintur-registry-import.service";
import { readRegistryUpload } from "./mintur-registry-upload";

@ApiTags("admin-establishments")
@ApiBearerAuth()
@Controller("admin/establishments")
@UseGuards(AuthGuard, RolesGuard)
export class AdminEstablishmentsController {
  constructor(
    @Inject(EstablishmentsService)
    private readonly establishments: EstablishmentsService,
    @Inject(MinturRegistryImportService)
    private readonly registryImport: MinturRegistryImportService,
    @Optional()
    @Inject(PlatformSettingsService)
    private readonly settings?: PlatformSettingsService,
  ) {}

  @Post("import")
  @Roles("ADMINISTRADOR")
  @RouteConfig({ rateLimit: { max: 5, timeWindow: "1 minute" } })
  async importRegistry(
    @Req() request: FastifyRequest,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    const file = await readRegistryUpload(request);
    return { data: this.registryImport.start(file.buffer, file.name, user.id) };
  }

  @Get("import/:jobId")
  @Roles("ADMINISTRADOR")
  importStatus(@Param("jobId") jobId: string) {
    return { data: this.registryImport.status(jobId) };
  }

  @Get()
  @Roles("ADMINISTRADOR", "AGENTE_TURISTICO")
  async list(
    @Query() query: AdminEstablishmentsQueryDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return {
      data: await this.establishments.list(
        query,
        user.id,
        user.roles.includes("ADMINISTRADOR"),
      ),
    };
  }

  @Get(":id/audit")
  @Roles("ADMINISTRADOR")
  async audit(@Param("id") id: string) {
    return { data: await this.establishments.getAudit(id) };
  }

  @Get(":id")
  @Roles("ADMINISTRADOR", "AGENTE_TURISTICO")
  async find(@Param("id") id: string, @CurrentUser() user: AuthenticatedUser) {
    return {
      data: await this.establishments.find(
        id,
        user.id,
        user.roles.includes("ADMINISTRADOR"),
      ),
    };
  }

  @Post()
  @Roles("ADMINISTRADOR", "AGENTE_TURISTICO")
  async create(
    @Body() body: CreateEstablishmentDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return {
      data: await this.establishments.create(
        user.id,
        body,
        user.roles.includes("ADMINISTRADOR"),
      ),
    };
  }

  @Patch(":id")
  @Roles("ADMINISTRADOR", "AGENTE_TURISTICO")
  async save(
    @Param("id") id: string,
    @Body() body: SaveEstablishmentDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return {
      data: await this.establishments.save(
        id,
        user.id,
        body,
        user.roles.includes("ADMINISTRADOR"),
        (await this.settings?.get())?.directPublishCatastros === true,
      ),
    };
  }

  @Delete(":id")
  @Roles("ADMINISTRADOR")
  async remove(
    @Param("id") id: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return { data: await this.establishments.remove(id, user.id) };
  }

  @Post(":id/submit-review")
  @Roles("ADMINISTRADOR", "AGENTE_TURISTICO")
  async submitReview(
    @Param("id") id: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    // Los agentes publican directo solo si el administrador dejó el paso libre.
    const publishDirectly =
      (await this.settings?.get())?.directPublishCatastros === true;
    return {
      data: await this.establishments.submitReview(
        id,
        user.id,
        user.roles.includes("ADMINISTRADOR"),
        publishDirectly,
      ),
    };
  }

  @Patch(":id/review")
  @Roles("ADMINISTRADOR")
  async review(
    @Param("id") id: string,
    @Body() body: ReviewEstablishmentDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return { data: await this.establishments.review(id, user.id, body) };
  }

  @Post(":id/deactivate")
  @Roles("ADMINISTRADOR")
  async deactivate(
    @Param("id") id: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return { data: await this.establishments.setActive(id, user.id, false) };
  }

  @Post(":id/reactivate")
  @Roles("ADMINISTRADOR")
  async reactivate(
    @Param("id") id: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return { data: await this.establishments.setActive(id, user.id, true) };
  }
}

@ApiTags("establishments")
@Controller("establishments")
export class PublicEstablishmentsController {
  constructor(
    @Inject(EstablishmentsService)
    private readonly establishments: EstablishmentsService,
  ) {}

  // Un paneo pide varias teselas a la vez: el límite global (300/min) se
  // agotaría enseguida, y el móvil las guarda en caché según Cache-Control.
  @Get("tiles/:z/:x/:y")
  @RouteConfig({ rateLimit: { max: 3000, timeWindow: "1 minute" } })
  async tile(
    @Param() coordinates: EstablishmentTileParamsDto,
    @Res() response: FastifyReply,
  ) {
    const tile = await this.establishments.tile(coordinates);
    response
      .header("Content-Type", "application/vnd.mapbox-vector-tile")
      .header("Cache-Control", "public, max-age=300")
      .send(tile);
  }

  @Get("nearby")
  async nearby(@Query() query: PublicEstablishmentsQueryDto) {
    return { data: await this.establishments.nearby(query) };
  }

  @Get(":id")
  async find(@Param("id") id: string) {
    return { data: await this.establishments.findPublic(id) };
  }
}

/** Página que abre el código QR pegado en cada establecimiento: `/e/:id`. */
@ApiTags("establishments")
@Controller("e")
export class EstablishmentQrPageController {
  constructor(
    @Inject(EstablishmentsService)
    private readonly establishments: EstablishmentsService,
  ) {}

  @Get(":id")
  async page(@Param("id") id: string, @Res() response: FastifyReply) {
    response
      .header("Content-Type", "text/html; charset=utf-8")
      .header(
        "Content-Security-Policy",
        "default-src 'none'; img-src 'self' data:; style-src 'unsafe-inline'; base-uri 'none'; form-action 'none'",
      )
      .header("Cache-Control", "public, max-age=60");
    try {
      const data = await this.establishments.findPublic(id);
      return response.send(renderEstablishmentPage(data));
    } catch (error) {
      if (
        error instanceof NotFoundException ||
        error instanceof BadRequestException
      ) {
        return response.status(404).send(renderEstablishmentNotFound());
      }
      throw error;
    }
  }
}

/** Página pública para descargar la app: `/descargar`. */
@ApiTags("establishments")
@Controller("descargar")
export class DownloadPageController {
  @Get()
  page(@Res() response: FastifyReply) {
    return response
      .header("Content-Type", "text/html; charset=utf-8")
      .header(
        "Content-Security-Policy",
        "default-src 'none'; style-src 'unsafe-inline'; base-uri 'none'; form-action 'none'",
      )
      .header("Cache-Control", "public, max-age=300")
      .send(renderDownloadPage());
  }

  /** Redirige al archivo más reciente; el enlace de la página no cambia nunca. */
  @Get("turismo-vinculacion.apk")
  apk(@Res() response: FastifyReply) {
    return response
      .header("Cache-Control", "no-cache")
      .redirect(APP_DOWNLOAD_URL, 302);
  }
}
