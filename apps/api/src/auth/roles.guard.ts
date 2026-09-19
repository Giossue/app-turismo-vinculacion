import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Inject,
  Injectable,
} from "@nestjs/common";
import { Reflector } from "@nestjs/core";

import { ROLES_KEY } from "./auth.decorators";
import type { AuthRole } from "./auth.types";

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(@Inject(Reflector) private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const required = this.reflector.getAllAndOverride<AuthRole[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!required?.length) {
      return true;
    }
    const user = context
      .switchToHttp()
      .getRequest<{ user?: { roles: AuthRole[] } }>().user;
    if (user?.roles.some((role) => required.includes(role))) {
      return true;
    }
    throw new ForbiddenException("No tienes permisos para esta operación.");
  }
}
