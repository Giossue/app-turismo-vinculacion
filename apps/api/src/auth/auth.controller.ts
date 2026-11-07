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
  UseFilters,
  UseGuards,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { RouteConfig } from "@nestjs/platform-fastify";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import { Type } from "class-transformer";
import type { FastifyReply, FastifyRequest } from "fastify";
import {
  IsDefined,
  IsEmail,
  IsIn,
  IsNotEmpty,
  IsObject,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  MinLength,
  ValidateNested,
} from "class-validator";

import { AuthService, type AuthResult } from "./auth.service";
import { CurrentUser } from "./auth.decorators";
import { AuthGuard } from "./auth.guard";
import { TOURIST_GENDER_OPTIONS, type AuthenticatedUser } from "./auth.types";
import { CodedHttpExceptionFilter } from "./coded-http.exception";

class LoginDto {
  @IsEmail()
  email!: string;

  @IsString()
  @MinLength(8)
  password!: string;
}

class MobileRefreshDto {
  @IsString()
  @MinLength(32)
  refreshToken!: string;
}

class AcceptedLegalDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(32)
  terms!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(32)
  privacy!: string;
}

class PartialAcceptedLegalDto {
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(32)
  terms?: string;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(32)
  privacy?: string;
}

class RegisterDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(150)
  name!: string;

  @IsEmail()
  @MaxLength(254)
  email!: string;

  @IsString()
  @IsNotEmpty()
  @IsIn(TOURIST_GENDER_OPTIONS)
  gender!: string;

  @IsString()
  @Matches(/^\d{4}-\d{2}-\d{2}$/)
  birthDate!: string;

  @IsString()
  @MinLength(12)
  @MaxLength(128)
  password!: string;

  @IsDefined()
  @IsObject()
  @ValidateNested()
  @Type(() => AcceptedLegalDto)
  acceptedLegal!: AcceptedLegalDto;

  @IsOptional()
  @IsString()
  @MaxLength(32)
  appVersion?: string;
}

class LegalAcceptancesDto {
  @IsDefined()
  @IsObject()
  @ValidateNested()
  @Type(() => PartialAcceptedLegalDto)
  acceptedLegal!: PartialAcceptedLegalDto;

  @IsOptional()
  @IsString()
  @MaxLength(32)
  appVersion?: string;
}

class DeleteAccountDto {
  @IsString()
  @IsNotEmpty()
  password!: string;
}

@ApiTags("auth")
@UseFilters(CodedHttpExceptionFilter)
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

  @Post("mobile/login")
  @HttpCode(200)
  async mobileLogin(@Body() body: LoginDto) {
    const result = await this.auth.login(body.email, body.password);
    return this.mobileSession(result);
  }

  @Post("mobile/register")
  @HttpCode(201)
  async mobileRegister(@Body() body: RegisterDto) {
    const result = await this.auth.register({
      acceptedLegal: body.acceptedLegal,
      appVersion: body.appVersion,
      birthDate: body.birthDate,
      email: body.email,
      gender: body.gender,
      name: body.name,
      password: body.password,
    });
    return this.mobileSession(result);
  }

  @Post("mobile/refresh")
  @HttpCode(200)
  async mobileRefresh(@Body() body: MobileRefreshDto) {
    const result = await this.auth.refresh(body.refreshToken);
    return this.mobileSession(result);
  }

  @Post("mobile/logout")
  @HttpCode(200)
  async mobileLogout(@Body() body: MobileRefreshDto) {
    await this.auth.logout(body.refreshToken);
    return { data: { loggedOut: true } };
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
      throw new UnauthorizedException("La cuenta no está activa.");
    }
    return { data: { user: current } };
  }

  @Post("legal-acceptances")
  @HttpCode(200)
  @ApiBearerAuth()
  @UseGuards(AuthGuard)
  async acceptLegalDocuments(
    @CurrentUser() user: AuthenticatedUser,
    @Body() body: LegalAcceptancesDto,
  ) {
    const pendingLegalDocuments = await this.auth.acceptLegalDocuments(
      user.id,
      body.acceptedLegal,
      body.appVersion,
    );
    return { data: { pendingLegalDocuments } };
  }

  @Post("account/delete")
  @HttpCode(200)
  @RouteConfig({ rateLimit: { max: 10, timeWindow: "1 minute" } })
  @ApiBearerAuth()
  @UseGuards(AuthGuard)
  async deleteAccount(
    @CurrentUser() user: AuthenticatedUser,
    @Body() body: DeleteAccountDto,
  ) {
    await this.auth.deleteAccount(user.id, body.password);
    return { data: { deleted: true } };
  }

  private cookieName(): string {
    return this.config.getOrThrow<string>("AUTH_REFRESH_COOKIE_NAME");
  }

  private mobileSession(result: AuthResult) {
    if (!result.refreshToken) {
      throw new UnauthorizedException("No se pudo crear la sesión móvil.");
    }
    return {
      data: {
        accessToken: result.accessToken,
        refreshToken: result.refreshToken,
        user: result.user,
      },
    };
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
