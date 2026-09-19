export const AUTH_ROLES = ["ADMINISTRADOR", "TURISTA"] as const;

export type AuthRole = (typeof AUTH_ROLES)[number];

export interface AuthenticatedUser {
  id: number;
  name: string;
  email: string;
  roles: AuthRole[];
  sessionId: string;
}

declare module "fastify" {
  interface FastifyRequest {
    user?: AuthenticatedUser;
  }
}
