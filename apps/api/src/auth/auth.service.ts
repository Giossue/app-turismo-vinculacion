import {
  BadRequestException,
  Inject,
  Injectable,
  InternalServerErrorException,
  UnauthorizedException,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import {
  createHash,
  randomBytes,
  randomUUID,
  timingSafeEqual,
} from "node:crypto";
import { EntityManager, type DataSource } from "typeorm";
import { InjectDataSource } from "@nestjs/typeorm";

import { AuthTokenService } from "./auth-token.service";
import { PasswordService } from "./password.service";
import {
  AUTH_ROLES,
  TOURIST_GENDER_OPTIONS,
  type AuthRole,
  type AuthenticatedUser,
} from "./auth.types";

interface UserRow {
  id: string;
  name: string;
  email: string;
  password: string;
  active: boolean;
  roles: string[];
}

interface SessionRow {
  token_id: string;
  family_id: string;
  usuario_id: string;
  token_hash: string;
  expires_at: Date;
  revoked_at: Date | null;
  replaced_by_token_id: string | null;
}

export interface AuthResult {
  accessToken: string;
  refreshToken?: string;
  user: Omit<AuthenticatedUser, "sessionId">;
}

export interface TouristRegistrationInput {
  name: string;
  email: string;
  gender: string;
  birthDate?: string;
  password: string;
}

const REFRESH_ROTATION_GRACE_MS = 10_000;

const DUMMY_PASSWORD_HASH =
  "$argon2id$v=19$m=19456,p=1,t=2$fBzM0vZF1J2J1cqC6NZANQ$BM8Yj5e6MUMnBEPG+v1d8oSDdCOjdaWYmfxjk0Vm3ao";

@Injectable()
export class AuthService {
  constructor(
    @InjectDataSource()
    private readonly dataSource: DataSource,
    @Inject(PasswordService)
    private readonly passwords: PasswordService,
    @Inject(AuthTokenService)
    private readonly tokens: AuthTokenService,
    @Inject(ConfigService)
    private readonly config: ConfigService,
  ) {}

  async login(email: string, password: string): Promise<AuthResult> {
    const normalizedEmail = email.trim().toLowerCase();
    const user = await this.findUserByEmail(normalizedEmail);
    const passwordMatches = await this.passwords.verify(
      user?.password ?? DUMMY_PASSWORD_HASH,
      password,
    );
    if (!user || !user.active || !passwordMatches) {
      throw new UnauthorizedException("Correo o contraseña inválidos.");
    }

    return this.createSession(this.toUser(user));
  }

  async register(input: TouristRegistrationInput): Promise<AuthResult> {
    const name = input.name.trim().replace(/\s+/g, " ");
    const email = input.email.trim().toLowerCase();
    const gender = input.gender?.trim() ?? "";
    const birthDate = input.birthDate?.trim() || null;

    if (!name || name.length > 150 || !email || email.length > 254) {
      throw new BadRequestException("Los datos de la cuenta no son válidos.");
    }
    if (
      !gender ||
      gender.length > 30 ||
      !TOURIST_GENDER_OPTIONS.includes(
        gender as (typeof TOURIST_GENDER_OPTIONS)[number],
      )
    ) {
      throw new BadRequestException("Los datos de la cuenta no son válidos.");
    }
    if (birthDate && !isValidBirthDate(birthDate)) {
      throw new BadRequestException("La fecha de nacimiento no es válida.");
    }

    const passwordHash = await this.passwords.hash(input.password);
    let userId: number;
    try {
      userId = await this.dataSource.transaction(async (manager) => {
        const users = (await manager.query(
          `INSERT INTO usuarios (nombre, email, genero, fecha_nac, password, activo)
           VALUES ($1, $2, $3, $4, $5, TRUE)
           RETURNING id`,
          [name, email, gender, birthDate, passwordHash],
        )) as { id: string }[];
        const user = users[0];
        if (!user) {
          throw new InternalServerErrorException(
            "No se pudo crear la cuenta turística.",
          );
        }

        const roles = (await manager.query(
          "SELECT id FROM roles WHERE nombre_rol = 'TURISTA'",
        )) as { id: string }[];
        if (!roles[0]) {
          throw new InternalServerErrorException(
            "El rol TURISTA no está configurado.",
          );
        }
        await manager.query(
          `INSERT INTO usuarios_roles (rol_id, usuario_id)
           VALUES ($1, $2)
           ON CONFLICT (rol_id, usuario_id) DO NOTHING`,
          [roles[0].id, user.id],
        );
        return Number(user.id);
      });
    } catch (error) {
      if (isUniqueViolation(error)) {
        throw new BadRequestException(
          "No se pudo crear la cuenta con esos datos.",
        );
      }
      throw error;
    }

    const user = await this.findUserById(userId);
    if (!user) {
      throw new InternalServerErrorException(
        "No se pudo preparar la sesión turística.",
      );
    }
    return this.createSession(user);
  }

  async refresh(refreshToken: string): Promise<AuthResult> {
    const parsed = this.parseRefreshToken(refreshToken);
    if (!parsed) {
      throw new UnauthorizedException("La sesión de renovación no es válida.");
    }

    return this.dataSource.transaction(async (manager) => {
      const rows = (await manager.query(
        `SELECT token_id, family_id, usuario_id, token_hash, expires_at, revoked_at,
                replaced_by_token_id
           FROM auth_sessions
          WHERE token_id = $1
          FOR UPDATE`,
        [parsed.tokenId],
      )) as SessionRow[];
      const session = rows[0];
      const suppliedHash = this.hashToken(refreshToken);
      if (!session || !this.safeEqualHash(session.token_hash, suppliedHash)) {
        if (session) {
          await manager.query(
            "UPDATE auth_sessions SET revoked_at = COALESCE(revoked_at, CURRENT_TIMESTAMP) WHERE family_id = $1",
            [session.family_id],
          );
        }
        throw new UnauthorizedException(
          "La sesión de renovación no es válida.",
        );
      }

      const recentlyRotated = this.wasRecentlyRotated(session);
      if (
        new Date(session.expires_at).getTime() <= Date.now() ||
        (session.revoked_at && !recentlyRotated)
      ) {
        await manager.query(
          "UPDATE auth_sessions SET revoked_at = COALESCE(revoked_at, CURRENT_TIMESTAMP) WHERE family_id = $1",
          [session.family_id],
        );
        throw new UnauthorizedException("La sesión de renovación expiró.");
      }

      const user = await this.findUserByIdWithManager(
        manager,
        Number(session.usuario_id),
      );
      if (!user || !user.active) {
        throw new UnauthorizedException("La cuenta no está activa.");
      }

      if (recentlyRotated) {
        const authenticatedUser = this.toUser(
          user,
          session.replaced_by_token_id ?? session.token_id,
        );
        return {
          accessToken: await this.tokens.signAccessToken(authenticatedUser),
          user: this.publicUser(authenticatedUser),
        };
      }

      const next = this.createRefreshToken();
      await this.insertSession(
        manager,
        Number(user.id),
        next,
        session.family_id,
      );
      await manager.query(
        `UPDATE auth_sessions
            SET revoked_at = CURRENT_TIMESTAMP,
                replaced_by_token_id = $2,
                last_used_at = CURRENT_TIMESTAMP
          WHERE token_id = $1`,
        [parsed.tokenId, next.tokenId],
      );
      const authenticatedUser = this.toUser(user, next.tokenId);
      return {
        accessToken: await this.tokens.signAccessToken(authenticatedUser),
        refreshToken: next.raw,
        user: this.publicUser(authenticatedUser),
      };
    });
  }

  async logout(refreshToken: string | undefined): Promise<void> {
    const parsed = refreshToken
      ? this.parseRefreshToken(refreshToken)
      : undefined;
    if (!parsed) {
      return;
    }
    await this.dataSource.query(
      "UPDATE auth_sessions SET revoked_at = COALESCE(revoked_at, CURRENT_TIMESTAMP) WHERE token_id = $1",
      [parsed.tokenId],
    );
  }

  async findUserById(
    id: number,
  ): Promise<Omit<AuthenticatedUser, "sessionId"> | null> {
    const user = await this.findUserByIdWithManager(
      this.dataSource.manager,
      id,
    );
    return user && user.active ? this.publicUser(this.toUser(user)) : null;
  }

  private async createSession(
    user: Omit<AuthenticatedUser, "sessionId">,
  ): Promise<AuthResult> {
    const refresh = this.createRefreshToken();
    await this.insertSession(
      this.dataSource.manager,
      user.id,
      refresh,
      refresh.familyId,
    );
    const authenticatedUser = { ...user, sessionId: refresh.tokenId };
    return {
      accessToken: await this.tokens.signAccessToken(authenticatedUser),
      refreshToken: refresh.raw,
      user,
    };
  }

  private async insertSession(
    manager: EntityManager,
    userId: number,
    refresh: RefreshToken,
    familyId: string,
  ): Promise<void> {
    const days = this.config.getOrThrow<number>("AUTH_REFRESH_TTL_DAYS");
    await manager.query(
      `INSERT INTO auth_sessions (token_id, family_id, usuario_id, token_hash, expires_at)
       VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP + ($5 * INTERVAL '1 day'))`,
      [refresh.tokenId, familyId, userId, this.hashToken(refresh.raw), days],
    );
  }

  private async findUserByEmail(email: string): Promise<UserRow | null> {
    const rows = (await this.dataSource.query(
      this.userQuery("lower(u.email) = $1"),
      [email],
    )) as UserRow[];
    return rows[0] ?? null;
  }

  private async findUserByIdWithManager(
    manager: EntityManager,
    id: number,
  ): Promise<UserRow | null> {
    const rows = (await manager.query(this.userQuery("u.id = $1"), [
      id,
    ])) as UserRow[];
    return rows[0] ?? null;
  }

  private userQuery(where: string): string {
    return `SELECT u.id, u.nombre AS name, lower(u.email) AS email, u.password,
                   u.activo AS active,
                   COALESCE(array_agg(r.nombre_rol) FILTER (WHERE r.nombre_rol IS NOT NULL), '{}') AS roles
              FROM usuarios u
              LEFT JOIN usuarios_roles ur ON ur.usuario_id = u.id
              LEFT JOIN roles r ON r.id = ur.rol_id
             WHERE ${where}
             GROUP BY u.id`;
  }

  private toUser(row: UserRow, sessionId = ""): AuthenticatedUser {
    return {
      id: Number(row.id),
      name: row.name,
      email: row.email,
      roles: row.roles.filter((role): role is AuthRole =>
        AUTH_ROLES.includes(role as AuthRole),
      ),
      sessionId,
    };
  }

  private publicUser(
    user: AuthenticatedUser,
  ): Omit<AuthenticatedUser, "sessionId"> {
    return {
      id: user.id,
      name: user.name,
      email: user.email,
      roles: user.roles,
    };
  }

  private createRefreshToken(): RefreshToken {
    const tokenId = randomUUID();
    const familyId = randomUUID();
    const secret = randomBytes(32).toString("base64url");
    return { tokenId, familyId, raw: `${tokenId}.${secret}` };
  }

  private wasRecentlyRotated(session: SessionRow): boolean {
    if (!session.revoked_at || !session.replaced_by_token_id) {
      return false;
    }
    const elapsed = Date.now() - new Date(session.revoked_at).getTime();
    return elapsed >= 0 && elapsed <= REFRESH_ROTATION_GRACE_MS;
  }

  private parseRefreshToken(raw: string): { tokenId: string } | null {
    const [tokenId, secret, ...rest] = raw.split(".");
    if (!tokenId || !secret || rest.length > 0) {
      return null;
    }
    // UUID parsing is deliberately strict; the secret itself is only inspected
    // through the hash stored in PostgreSQL.
    if (!/^[0-9a-f-]{36}$/i.test(tokenId) || secret.length < 32) {
      return null;
    }
    return { tokenId };
  }

  private hashToken(token: string): string {
    return createHash("sha256").update(token).digest("hex");
  }

  private safeEqualHash(left: string, right: string): boolean {
    const a = Buffer.from(left, "hex");
    const b = Buffer.from(right, "hex");
    return a.length === b.length && timingSafeEqual(a, b);
  }
}

interface RefreshToken {
  tokenId: string;
  familyId: string;
  raw: string;
}

function isValidBirthDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const parsed = new Date(`${value}T00:00:00.000Z`);
  if (Number.isNaN(parsed.getTime())) return false;
  if (parsed.toISOString().slice(0, 10) !== value) return false;
  return parsed.getTime() <= Date.now();
}

function isUniqueViolation(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    error.code === "23505"
  );
}
