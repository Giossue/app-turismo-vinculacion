import { Controller, Get, Inject, Param, Query, Res } from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import type { FastifyReply } from "fastify";

import {
  PUBLIC_CENTER_REPOSITORY,
  type PublicCenterRepository,
} from "../centers/application/public-center.repository";
import {
  isValidCenterCode,
  parseRouteShareQuery,
  renderCenterNotFound,
  renderCenterSharePage,
  renderRouteNotFound,
  renderRouteSharePage,
  type RouteShareQuery,
} from "./share-pages";

/** Mismas cabeceras que la página del QR: HTML estático sin scripts. */
function sendHtml(response: FastifyReply, status: number, html: string) {
  return response
    .status(status)
    .header("Content-Type", "text/html; charset=utf-8")
    .header(
      "Content-Security-Policy",
      "default-src 'none'; img-src 'self' data:; style-src 'unsafe-inline'; base-uri 'none'; form-action 'none'",
    )
    .header("Cache-Control", "public, max-age=60")
    .send(html);
}

/** Enlace compartido de un centro turístico: `/c/:code`. */
@ApiTags("sharing")
@Controller("c")
export class CenterSharePageController {
  constructor(
    @Inject(PUBLIC_CENTER_REPOSITORY)
    private readonly centers: PublicCenterRepository,
  ) {}

  @Get(":code")
  async page(@Param("code") code: string, @Res() response: FastifyReply) {
    const trimmed = code.trim();
    const center = isValidCenterCode(trimmed)
      ? await this.centers.findPublishedByCode(trimmed)
      : null;
    return center
      ? sendHtml(response, 200, renderCenterSharePage(center))
      : sendHtml(response, 404, renderCenterNotFound());
  }
}

/** Enlace compartido de una ruta: `/r?lat=&lng=&name=&mode=`. */
@ApiTags("sharing")
@Controller("r")
export class RouteSharePageController {
  @Get()
  page(@Query() query: RouteShareQuery, @Res() response: FastifyReply) {
    const route = parseRouteShareQuery(query);
    return route
      ? sendHtml(response, 200, renderRouteSharePage(route))
      : sendHtml(response, 400, renderRouteNotFound());
  }
}
