import {
  Body,
  Controller,
  Get,
  HttpCode,
  Inject,
  Post,
  Req,
  Res,
  UnauthorizedException,
  UseGuards,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import type { FastifyReply, FastifyRequest } from "fastify";
import { IsEmail, IsString, MinLength } from "class-validator";

import { AuthService } from "./auth.service";
import { CurrentUser } from "./auth.decorators";
import { AuthGuard } from "./auth.guard";
import type { AuthenticatedUser } from "./auth.types";

class LoginDto {
  @IsEmail()
  email!: string;

  @IsString()
  @MinLength(8)
  password!: string;
}

@ApiTags("auth")
@Controller("auth")
export class AuthController {
  constructor(
    @Inject(AuthService)
    private readonly auth: AuthService,
    @Inject(ConfigService)
    private readonly config: ConfigService,
  ) {}

  @Post("login")
  @HttpCode(200)
  async login(
    @Body() body: LoginDto,
    @Res({ passthrough: true }) response: FastifyReply,
  ) {
    const result = await this.auth.login(body.email, body.password);
    if (result.refreshToken) {
      this.setRefreshCookie(response, result.refreshToken);
    }
    return { data: { accessToken: result.accessToken, user: result.user } };
  }

  @Post("refresh")
  @HttpCode(200)
  async refresh(
    @Req() request: FastifyRequest,
    @Res({ passthrough: true }) response: FastifyReply,
  ) {
    const refreshToken = request.cookies?.[this.cookieName()];
    if (!refreshToken) {
      throw new UnauthorizedException("No existe una sesión de renovación.");
    }
    const result = await this.auth.refresh(refreshToken);
    if (result.refreshToken) {
      this.setRefreshCookie(response, result.refreshToken);
    }
    return { data: { accessToken: result.accessToken, user: result.user } };
  }

  @Post("logout")
  @HttpCode(200)
  async logout(
    @Req() request: FastifyRequest,
    @Res({ passthrough: true }) response: FastifyReply,
  ) {
    await this.auth.logout(request.cookies?.[this.cookieName()]);
    response.clearCookie(this.cookieName(), { path: "/api/v1/auth" });
    return { data: { loggedOut: true } };
  }

  @Get("me")
  @ApiBearerAuth()
  @UseGuards(AuthGuard)
  async me(@CurrentUser() user: AuthenticatedUser) {
    const current = await this.auth.findUserById(user.id);
    if (!current) {
      throw new UnauthorizedException(
        "La cuenta institucional no está activa.",
      );
    }
    return { data: { user: current } };
  }

  private cookieName(): string {
    return this.config.getOrThrow<string>("AUTH_REFRESH_COOKIE_NAME");
  }

  private setRefreshCookie(response: FastifyReply, value: string): void {
    const maxAge =
      this.config.getOrThrow<number>("AUTH_REFRESH_TTL_DAYS") * 24 * 60 * 60;
    response.setCookie(this.cookieName(), value, {
      httpOnly: true,
      secure: this.config.getOrThrow<string>("NODE_ENV") === "production",
      sameSite: "lax",
      path: "/api/v1/auth",
      maxAge,
    });
  }
}
