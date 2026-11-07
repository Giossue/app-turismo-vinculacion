import {
  BadRequestException,
  HttpStatus,
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

import {
  hasCurrentLegalVersion,
  pendingLegalDocuments,
  type LegalAcceptanceRecord,
} from "../legal/legal-documents";
import { LEGAL_MINIMUM_AGE } from "../legal/legal-responsible";
import {
  LEGAL_DOCUMENT_TYPES,
  type LegalDocumentType,
} from "../legal/legal.types";
import { anonymizeAccount, lockAccountSessions } from "./account-deletion";
import { AuthTokenService } from "./auth-token.service";
import { CodedHttpException } from "./coded-http.exception";
import { PasswordService } from "./password.service";
import {
  AUTH_ROLES,
  TOURIST_GENDER_OPTIONS,
  isTouristAccount,
  type AuthRole,
  type AuthenticatedUser,
  type SessionUser,
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
  user: SessionUser;
}

export type AcceptedLegalVersions = Partial<Record<LegalDocumentType, string>>;

export interface TouristRegistrationInput {
  name: string;
  email: string;
  gender: string;
  birthDate: string;
  password: string;
  acceptedLegal: Record<LegalDocumentType, string>;
  appVersion?: string;
}

const REFRESH_ROTATION_GRACE_MS = 10_000;
const LEGAL_TIME_ZONE = "America/Guayaquil";

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

    return this.createSession({
      ...this.toUser(user),
      pendingLegalDocuments: await this.findPendingLegalDocuments(
        this.dataSource.manager,
        user,
      ),
    });
  }

  async register(input: TouristRegistrationInput): Promise<AuthResult> {
    const name = input.name.trim().replace(/\s+/g, " ");
    const email = input.email.trim().toLowerCase();
    const gender = input.gender?.trim() ?? "";
    const birthDate = input.birthDate?.trim() ?? "";
    const acceptedLegal = declaredLegalVersions(input.acceptedLegal);
    const appVersion = input.appVersion?.trim() || null;

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
    if (!isValidBirthDate(birthDate)) {
      throw new BadRequestException("La fecha de nacimiento no es válida.");
    }
    if (acceptedLegal.length !== LEGAL_DOCUMENT_TYPES.length) {
      throw new BadRequestException(
        "Debes aceptar los Términos y condiciones y la Política de privacidad.",
      );
    }
    if (!hasReachedMinimumAge(birthDate)) {
      throw new CodedHttpException(
        HttpStatus.BAD_REQUEST,
        "UNDERAGE",
        `Debes tener al menos ${LEGAL_MINIMUM_AGE} años para crear una cuenta.`,
      );
    }
    assertCurrentLegalVersions(acceptedLegal);

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
        await this.insertLegalAcceptances(
          manager,
          user.id,
          acceptedLegal,
          appVersion,
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
          user: await this.toSessionUser(manager, user),
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
        user: await this.toSessionUser(manager, user),
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

  async findUserById(id: number): Promise<SessionUser | null> {
    const user = await this.findUserByIdWithManager(
      this.dataSource.manager,
      id,
    );
    return user && user.active
      ? this.toSessionUser(this.dataSource.manager, user)
      : null;
  }

  /** Solo inserta: repetir la aceptación conserva la constancia original. */
  async acceptLegalDocuments(
    userId: number,
    accepted: AcceptedLegalVersions,
    appVersion?: string,
  ): Promise<LegalDocumentType[]> {
    const declared = declaredLegalVersions(accepted);
    if (declared.length === 0) {
      throw new BadRequestException("Debes aceptar al menos un documento.");
    }
    assertCurrentLegalVersions(declared);

    return this.dataSource.transaction(async (manager) => {
      const user = await this.findUserByIdWithManager(manager, userId);
      if (!user || !user.active) {
        throw new UnauthorizedException("La cuenta no está activa.");
      }
      await this.insertLegalAcceptances(
        manager,
        user.id,
        declared,
        appVersion?.trim() || null,
      );
      return (await this.toSessionUser(manager, user)).pendingLegalDocuments;
    });
  }

  /**
   * Una segunda solicitud, simultánea o posterior, ya no encuentra una cuenta activa.
   * La contraseña se verifica antes de abrir la transacción: Argon2 no retiene el bloqueo.
   */
  async deleteAccount(userId: number, password: string): Promise<void> {
    const user = await this.findUserByIdWithManager(
      this.dataSource.manager,
      userId,
    );
    const account = this.assertDeletable(user);
    if (!(await this.passwords.verify(account.password, password))) {
      throw new CodedHttpException(
        HttpStatus.BAD_REQUEST,
        "INVALID_PASSWORD",
        "La contraseña no es correcta.",
      );
    }

    await this.dataSource.transaction(async (manager) => {
      await lockAccountSessions(manager, userId);
      await manager.query("SELECT id FROM usuarios WHERE id = $1 FOR UPDATE", [
        userId,
      ]);
      this.assertDeletable(await this.findUserByIdWithManager(manager, userId));
      await anonymizeAccount(manager, userId);
    });
  }

  private assertDeletable(user: UserRow | null): UserRow {
    if (!user || !user.active) {
      throw new UnauthorizedException("La cuenta no está activa.");
    }
    if (!isTouristAccount(user.roles)) {
      throw new CodedHttpException(
        HttpStatus.FORBIDDEN,
        "ACCOUNT_NOT_DELETABLE",
        "Esta cuenta no se puede eliminar desde la app.",
      );
    }
    return user;
  }

  private async insertLegalAcceptances(
    manager: EntityManager,
    userId: string,
    accepted: readonly DeclaredLegalVersion[],
    appVersion: string | null,
  ): Promise<void> {
    await manager.query(
      `INSERT INTO aceptaciones_legales (usuario_id, documento, version, version_app)
       SELECT $1, documento, version, $4
         FROM unnest($2::text[], $3::text[]) AS declarada (documento, version)
       ON CONFLICT (usuario_id, documento, version) DO NOTHING`,
      [
        userId,
        accepted.map((item) => item.type),
        accepted.map((item) => item.version),
        appVersion,
      ],
    );
  }

  private async createSession(user: SessionUser): Promise<AuthResult> {
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

  private async toSessionUser(
    manager: EntityManager,
    row: UserRow,
  ): Promise<SessionUser> {
    const { id, name, email, roles } = this.toUser(row);
    return {
      id,
      name,
      email,
      roles,
      pendingLegalDocuments: await this.findPendingLegalDocuments(manager, row),
    };
  }

  private async findPendingLegalDocuments(
    manager: EntityManager,
    row: UserRow,
  ): Promise<LegalDocumentType[]> {
    if (!isTouristAccount(row.roles)) {
      return [];
    }
    const acceptances = (await manager.query(
      "SELECT documento, version FROM aceptaciones_legales WHERE usuario_id = $1",
      [row.id],
    )) as LegalAcceptanceRecord[];
    return pendingLegalDocuments(acceptances);
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

interface DeclaredLegalVersion {
  type: LegalDocumentType;
  version: string;
}

function declaredLegalVersions(
  accepted: AcceptedLegalVersions | undefined,
): DeclaredLegalVersion[] {
  return LEGAL_DOCUMENT_TYPES.flatMap((type) => {
    const version = accepted?.[type];
    return typeof version === "string" && version.trim()
      ? [{ type, version: version.trim() }]
      : [];
  });
}

function assertCurrentLegalVersions(
  accepted: readonly DeclaredLegalVersion[],
): void {
  if (
    !accepted.every((item) => hasCurrentLegalVersion(item.type, item.version))
  ) {
    throw new CodedHttpException(
      HttpStatus.CONFLICT,
      "LEGAL_VERSION_OUTDATED",
      "Los documentos legales cambiaron. Revísalos y acéptalos de nuevo.",
    );
  }
}

/** Compara fechas ISO como texto; quien nació un 29 de febrero cumple el 1 de marzo. */
function hasReachedMinimumAge(birthDate: string): boolean {
  const today = new Intl.DateTimeFormat("en-CA", {
    timeZone: LEGAL_TIME_ZONE,
  }).format(new Date());
  const limit = `${Number(today.slice(0, 4)) - LEGAL_MINIMUM_AGE}${today.slice(4)}`;
  return birthDate <= limit;
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
