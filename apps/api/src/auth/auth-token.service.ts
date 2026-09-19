import { Inject, Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { jwtVerify, SignJWT, type JWTPayload } from "jose";

import type { AuthRole, AuthenticatedUser } from "./auth.types";

export interface AuthTokenClaims extends JWTPayload {
  sub: string;
  sid: string;
  roles: AuthRole[];
}

@Injectable()
export class AuthTokenService {
  private readonly secret: Uint8Array;
  private readonly issuer = "turismo-vinculacion-api";
  private readonly audience = "turismo-admin";

  constructor(@Inject(ConfigService) private readonly config: ConfigService) {
    this.secret = new TextEncoder().encode(
      this.config.getOrThrow<string>("AUTH_JWT_ACCESS_SECRET"),
    );
  }

  async signAccessToken(user: AuthenticatedUser): Promise<string> {
    const ttl = this.config.getOrThrow<number>("AUTH_ACCESS_TTL_SECONDS");
    return new SignJWT({
      sid: user.sessionId,
      roles: user.roles,
    })
      .setProtectedHeader({ alg: "HS256", typ: "JWT" })
      .setSubject(String(user.id))
      .setIssuer(this.issuer)
      .setAudience(this.audience)
      .setIssuedAt()
      .setExpirationTime(`${ttl}s`)
      .sign(this.secret);
  }

  async verifyAccessToken(token: string): Promise<AuthTokenClaims> {
    const result = await jwtVerify<AuthTokenClaims>(token, this.secret, {
      issuer: this.issuer,
      audience: this.audience,
    });
    if (!result.payload.sub || !result.payload.sid || !result.payload.roles) {
      throw new Error("Invalid access token claims");
    }
    return result.payload;
  }
}
