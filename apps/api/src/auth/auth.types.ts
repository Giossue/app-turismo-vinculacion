export const AUTH_ROLES = [
  "ADMINISTRADOR",
  "AGENTE_TURISTICO",
  "TURISTA",
] as const;

/**
 * Labels used by Ecuador's civil-identity framework for the registered gender
 * field. Keep this list closed so registration cannot persist arbitrary values.
 */
export const TOURIST_GENDER_OPTIONS = ["Masculino", "Femenino"] as const;

export type TouristGender = (typeof TOURIST_GENDER_OPTIONS)[number];

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
