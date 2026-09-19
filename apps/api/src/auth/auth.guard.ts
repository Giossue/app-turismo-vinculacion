import {
  CanActivate,
  ExecutionContext,
  Inject,
  Injectable,
  UnauthorizedException,
} from "@nestjs/common";
import type { FastifyRequest } from "fastify";

import { AuthTokenService } from "./auth-token.service";
import type { AuthRole, AuthenticatedUser } from "./auth.types";

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(
    @Inject(AuthTokenService) private readonly tokens: AuthTokenService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<FastifyRequest>();
    const token = this.extractBearerToken(request.headers.authorization);
    if (!token) {
      throw new UnauthorizedException("Se requiere una sesión institucional.");
    }

    try {
      const claims = await this.tokens.verifyAccessToken(token);
      request.user = {
        id: Number(claims.sub),
        name: "",
        email: "",
        roles: claims.roles as AuthRole[],
        sessionId: claims.sid,
      } satisfies AuthenticatedUser;
      return true;
    } catch {
      throw new UnauthorizedException("La sesión institucional no es válida.");
    }
  }

  private extractBearerToken(value: string | undefined): string | undefined {
    if (!value?.startsWith("Bearer ")) {
      return undefined;
    }
    const token = value.slice("Bearer ".length).trim();
    return token.length > 0 ? token : undefined;
  }
}
