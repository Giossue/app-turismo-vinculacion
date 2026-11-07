import {
  CanActivate,
  ExecutionContext,
  Inject,
  Injectable,
  UnauthorizedException,
} from "@nestjs/common";
import { InjectDataSource } from "@nestjs/typeorm";
import type { FastifyRequest } from "fastify";
import type { DataSource } from "typeorm";

import { AuthTokenService } from "./auth-token.service";
import type { AuthRole, AuthenticatedUser } from "./auth.types";

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(
    @Inject(AuthTokenService) private readonly tokens: AuthTokenService,
    @InjectDataSource() private readonly dataSource: DataSource,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<FastifyRequest>();
    const token = this.extractBearerToken(request.headers.authorization);
    if (!token) {
      throw new UnauthorizedException("Se requiere una sesión autenticada.");
    }

    let user: AuthenticatedUser;
    try {
      const claims = await this.tokens.verifyAccessToken(token);
      user = {
        id: Number(claims.sub),
        name: "",
        email: "",
        roles: claims.roles as AuthRole[],
        sessionId: claims.sid,
      };
    } catch {
      throw new UnauthorizedException("La sesión autenticada no es válida.");
    }

    // Fuera del catch: una caída de la base no debe parecer una sesión vencida.
    await this.rejectDeletedAccount(user.id);
    request.user = user;
    return true;
  }

  /** El access token sigue firmado hasta expirar; eliminar la cuenta no lo invalida. */
  private async rejectDeletedAccount(userId: number): Promise<void> {
    const rows = await this.dataSource.query<unknown[]>(
      "SELECT id FROM usuarios WHERE id = $1 AND eliminado_at IS NULL",
      [userId],
    );
    if (!rows[0]) {
      throw new UnauthorizedException("La cuenta no está activa.");
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
