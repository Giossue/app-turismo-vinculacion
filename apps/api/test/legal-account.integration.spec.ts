import "reflect-metadata";

import { randomUUID } from "node:crypto";

import cookie from "@fastify/cookie";
import { Module, ValidationPipe } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { NestFactory, Reflector } from "@nestjs/core";
import {
  FastifyAdapter,
  type NestFastifyApplication,
} from "@nestjs/platform-fastify";
import { getDataSourceToken } from "@nestjs/typeorm";
import { DataSource } from "typeorm";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { AdminCentersService } from "../src/admin/admin-centers.service";
import { AdminUsersService } from "../src/admin/admin-users.service";
import { AdminController } from "../src/admin/admin.controller";
import {
  ACCOUNT_DELETED_NAME,
  ERASED_OPINION_COMMENT,
  USUARIOS_REFERENCES,
} from "../src/auth/account-deletion";
import { AuthController } from "../src/auth/auth.controller";
import { AuthGuard } from "../src/auth/auth.guard";
import { AuthService } from "../src/auth/auth.service";
import { AuthTokenService } from "../src/auth/auth-token.service";
import { PasswordService } from "../src/auth/password.service";
import { RolesGuard } from "../src/auth/roles.guard";
import { HttpExceptionFilter } from "../src/common/http-exception.filter";
import { CURRENT_LEGAL_DOCUMENTS } from "../src/legal/legal-documents";
import { LegalModule } from "../src/legal/legal.module";
import { OpinionsService } from "../src/opinions/opinions.service";

// The runner owns the disposable cluster; no application environment or password
// file is consulted. Without it these suites are skipped, as the sibling ones are.
const socket = process.env.LEGAL_ACCOUNT_TEST_PGHOST;
const isolatedSocket = /^\/tmp\/turismo-legal-account-check-[a-z0-9-]+$/i.test(
  socket ?? "",
);
const port = Number(process.env.LEGAL_ACCOUNT_TEST_PGPORT ?? "55493");
const runId = randomUUID().slice(0, 8);
const PASSWORD = "una-clave-larga-de-prueba";

const CURRENT = Object.fromEntries(
  CURRENT_LEGAL_DOCUMENTS.map((document) => [document.type, document.version]),
) as { terms: string; privacy: string };
const OUTDATED_VERSION = "2020-01-01";

type Json = Record<string, unknown>;
type Reply = { statusCode: number; body: Json };
type Session = {
  accessToken: string;
  refreshToken: string;
  user: {
    id: number;
    name: string;
    email: string;
    roles: string[];
    pendingLegalDocuments: string[];
  };
};
type AcceptanceRow = {
  documento: string;
  version: string;
  aceptado_en: Date;
  version_app: string | null;
};

function guayaquilDate(yearsAgo: number, dayOffset = 0): string {
  const now = new Date(Date.now() + dayOffset * 86_400_000);
  const today = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Guayaquil",
  }).format(now);
  const [year, rest] = [today.slice(0, 4), today.slice(4)];
  return `${Number(year) - yearsAgo}${rest}`;
}

describe.skipIf(!isolatedSocket)(
  "legal acceptance and account deletion with PostgreSQL",
  () => {
    let source: DataSource;
    let app: NestFastifyApplication;
    let opinions: OpinionsService;
    let sequence = 0;
    let centerId: string;
    let centerCode: string;
    let poiId: string;
    let establishmentId: string;
    let administrator: { id: number; email: string };
    let agentRole: string;
    let adminRole: string;
    let touristRole: string;

    function email(label: string) {
      sequence += 1;
      return `${label}-${runId}-${sequence}@example.com`;
    }

    async function call(
      method: "GET" | "POST",
      url: string,
      options: { token?: string; body?: unknown } = {},
    ): Promise<Reply> {
      const response = await app.inject({
        method,
        url: `/api/v1${url}`,
        headers: options.token
          ? { authorization: `Bearer ${options.token}` }
          : {},
        ...(options.body === undefined
          ? {}
          : { payload: options.body as Json }),
      });
      return {
        statusCode: response.statusCode,
        body: response.json<Json>(),
      };
    }

    function registration(overrides: Json = {}) {
      return {
        name: "Ana Pérez",
        email: email("registro"),
        gender: "Femenino",
        birthDate: "1998-02-03",
        password: PASSWORD,
        acceptedLegal: CURRENT,
        appVersion: "1.4.0",
        ...overrides,
      };
    }

    function session(reply: Reply): Session {
      return reply.body.data as Session;
    }

    async function registerTourist(overrides: Json = {}) {
      const body = registration(overrides);
      const reply = await call("POST", "/auth/mobile/register", { body });
      expect(reply.statusCode).toBe(201);
      return { ...session(reply), email: body.email as string };
    }

    /** A pre-existing account: inserted the way older versions left it. */
    async function legacyAccount(roles: string[]) {
      const address = email("cuenta");
      const hash = await new PasswordService().hash(PASSWORD);
      const rows = await source.query<{ id: string }[]>(
        `INSERT INTO usuarios (nombre, email, password, activo)
         VALUES ('Cuenta Previa', $1, $2, TRUE) RETURNING id`,
        [address, hash],
      );
      const id = Number(rows[0]!.id);
      for (const role of roles) {
        await source.query(
          "INSERT INTO usuarios_roles (rol_id, usuario_id) VALUES ($1, $2)",
          [role, id],
        );
      }
      return { id, email: address };
    }

    async function login(address: string, password = PASSWORD) {
      return call("POST", "/auth/mobile/login", {
        body: { email: address, password },
      });
    }

    async function acceptances(userId: number) {
      return source.query<AcceptanceRow[]>(
        `SELECT documento, version, aceptado_en, version_app
           FROM aceptaciones_legales
          WHERE usuario_id = $1
          ORDER BY documento, id`,
        [userId],
      );
    }

    async function countAccounts(address: string) {
      const rows = await source.query<{ total: number }[]>(
        "SELECT COUNT(*)::int AS total FROM usuarios WHERE lower(email) = lower($1)",
        [address],
      );
      return rows[0]!.total;
    }

    async function accountRow(id: number) {
      const rows = await source.query<Json[]>(
        `SELECT nombre, email, genero, fecha_nac, password, activo, eliminado_at,
                email_verified_at, remember_token
           FROM usuarios WHERE id = $1`,
        [id],
      );
      return rows[0]!;
    }

    async function withFailingTrigger(
      table: string,
      condition: string,
      action: () => Promise<void>,
    ) {
      const name = `test_fail_${runId.replace(/-/g, "")}`;
      await source.query(`
        CREATE FUNCTION ${name}() RETURNS trigger AS $$
        BEGIN
          IF ${condition} THEN RAISE EXCEPTION 'forced integration failure'; END IF;
          RETURN NEW;
        END $$ LANGUAGE plpgsql`);
      await source.query(
        `CREATE TRIGGER ${name} BEFORE INSERT OR UPDATE ON ${table}
         FOR EACH ROW EXECUTE FUNCTION ${name}()`,
      );
      try {
        await action();
      } finally {
        await source.query(`DROP TRIGGER ${name} ON ${table}`);
        await source.query(`DROP FUNCTION ${name}()`);
      }
    }

    /** Fills every table a tourist can own, returning what the walk must find. */
    async function seedOwnedData(userId: number) {
      await source.query(
        "INSERT INTO favoritos_centros (usuario_id, centro_turistico_id) VALUES ($1, $2)",
        [userId, centerId],
      );
      await source.query(
        "INSERT INTO favoritos_puntos_interes (usuario_id, punto_interes_id) VALUES ($1, $2)",
        [userId, poiId],
      );
      await source.query(
        "INSERT INTO favoritos_establecimientos (usuario_id, establecimiento_id) VALUES ($1, $2)",
        [userId, establishmentId],
      );
      const [itinerary] = await source.query<{ id: string }[]>(
        `INSERT INTO itinerarios_usuario (usuario_id, titulo, resumen)
         VALUES ($1, 'Mi plan', 'Un resumen') RETURNING id`,
        [userId],
      );
      const [day] = await source.query<{ id: string }[]>(
        `INSERT INTO itinerario_jornadas (itinerario_id, orden)
         VALUES ($1, 1) RETURNING id`,
        [itinerary!.id],
      );
      await source.query(
        `INSERT INTO itinerario_paradas (jornada_id, centro_turistico_id, orden)
         VALUES ($1, $2, 1)`,
        [day!.id, centerId],
      );
      await source.query(
        "INSERT INTO preferencias_historial_ia (usuario_id, habilitado) VALUES ($1, TRUE)",
        [userId],
      );
      for (const voluntary of [true, false]) {
        const [conversation] = await source.query<{ id: string }[]>(
          `INSERT INTO conversaciones_ia (usuario_id, historial_voluntario)
           VALUES ($1, $2) RETURNING id`,
          [userId, voluntary],
        );
        await source.query(
          `INSERT INTO mensajes_ia (conversacion_id, rol_mensaje, contenido)
           VALUES ($1, 'USER', 'Pregunta privada')`,
          [conversation!.id],
        );
      }
      return { itineraryId: itinerary!.id, dayId: day!.id };
    }

    /** Adds an opinion with its full history straight in the moderated tables. */
    async function seedOpinion(
      userId: number,
      versions: Array<{
        rating: number | null;
        comment: string | null;
        status: "APROBADA" | "REEMPLAZADA" | "PENDIENTE" | "RECHAZADA";
      }>,
      moderationReason?: string,
    ) {
      const [opinion] = await source.query<{ id: string }[]>(
        `INSERT INTO opiniones (usuario_id, centro_turistico_id, estado_moderacion)
         VALUES ($1, $2, 'APROBADA') RETURNING id`,
        [userId, centerId],
      );
      let number = 0;
      for (const version of versions) {
        number += 1;
        const [row] = await source.query<{ id: string }[]>(
          `INSERT INTO opinion_versiones
             (codigo_publico, opinion_id, numero_version, calificacion, comentario,
              estado_moderacion)
           VALUES (gen_random_uuid(), $1, $2, $3, $4, $5) RETURNING id`,
          [opinion!.id, number, version.rating, version.comment, version.status],
        );
        if (version.status === "APROBADA") {
          await source.query(
            "UPDATE opiniones SET version_publicada_id = $2 WHERE id = $1",
            [opinion!.id, row!.id],
          );
        }
        if (moderationReason) {
          await source.query(
            `INSERT INTO moderaciones_opinion
               (opinion_id, opinion_version_id, moderador_id, accion, motivo)
             VALUES ($1, $2, $3, 'RECHAZAR', $4)`,
            [opinion!.id, row!.id, administrator.id, moderationReason],
          );
        }
      }
      return opinion!.id;
    }

    async function removeOpinionFixtures() {
      // uq_opiniones_activas_centro admits one live opinion per account and center.
      await source.query(
        "UPDATE opiniones SET eliminado_at = CURRENT_TIMESTAMP WHERE eliminado_at IS NULL",
      );
    }

    async function foreignKeysToUsuarios() {
      return source.query<{ table_name: string; column_name: string }[]>(
        `SELECT kcu.table_name, kcu.column_name
           FROM information_schema.table_constraints tc
           JOIN information_schema.key_column_usage kcu
             ON kcu.constraint_schema = tc.constraint_schema
            AND kcu.constraint_name = tc.constraint_name
           JOIN information_schema.constraint_column_usage ccu
             ON ccu.constraint_schema = tc.constraint_schema
            AND ccu.constraint_name = tc.constraint_name
          WHERE tc.constraint_type = 'FOREIGN KEY'
            AND tc.table_schema = 'public'
            AND ccu.table_name = 'usuarios'
          ORDER BY 1, 2`,
      );
    }

    beforeAll(async () => {
      source = new DataSource({
        type: "postgres",
        host: socket!,
        port,
        username: "legal_account_test",
        database: "turismo_vinculacion_app",
        password: "",
        synchronize: false,
        migrationsRun: false,
        logging: false,
      });
      await source.initialize();
      const [identity] = await source.query<Json[]>(
        `SELECT current_database() AS database, current_user AS username,
                inet_server_addr() AS address`,
      );
      expect(identity).toEqual({
        database: "turismo_vinculacion_app",
        username: "legal_account_test",
        address: null,
      });

      const values: Record<string, unknown> = {
        AUTH_JWT_ACCESS_SECRET: "integration-secret-integration-secret",
        AUTH_ACCESS_TTL_SECONDS: 900,
        AUTH_REFRESH_TTL_DAYS: 30,
        AUTH_REFRESH_COOKIE_NAME: "turismo_refresh",
        NODE_ENV: "test",
      };

      @Module({
        imports: [LegalModule],
        controllers: [AuthController, AdminController],
        providers: [
          AuthService,
          AuthTokenService,
          PasswordService,
          AuthGuard,
          RolesGuard,
          Reflector,
          AdminUsersService,
          { provide: AdminCentersService, useValue: {} },
          { provide: getDataSourceToken(), useValue: source },
          { provide: DataSource, useValue: source },
          {
            provide: ConfigService,
            useValue: { getOrThrow: (key: string) => values[key] },
          },
        ],
      })
      class IntegrationModule {}

      app = await NestFactory.create<NestFastifyApplication>(
        IntegrationModule,
        new FastifyAdapter(),
        { logger: false },
      );
      await app.register(cookie);
      app.setGlobalPrefix("api/v1");
      app.useGlobalPipes(
        new ValidationPipe({
          transform: true,
          whitelist: true,
          forbidNonWhitelisted: true,
        }),
      );
      app.useGlobalFilters(new HttpExceptionFilter());
      await app.init();
      await app.getHttpAdapter().getInstance().ready();

      opinions = new OpinionsService(source);

      const [center] = await source.query<{ id: string; code: string }[]>(
        `SELECT c.id, TRIM(c.codigo_atractivo) AS code
           FROM centros_turisticos c
           JOIN estados_resenia er ON er.id = c.estado_resenia_id
          WHERE er.codigo = 'PUBLICADO' AND c.activo AND c.eliminado_at IS NULL
          LIMIT 1`,
      );
      centerId = center!.id;
      centerCode = center!.code;
      const [poi] = await source.query<{ id: string }[]>(
        `INSERT INTO puntos_interes
           (nombre, latitud, longitud, zona_turistica_id, ubicacion)
         SELECT 'Punto de prueba', -1.59, -79, z.id,
                ST_SetSRID(ST_MakePoint(-79, -1.59), 4326)::geography
           FROM zonas_turisticas z LIMIT 1
         RETURNING id`,
      );
      poiId = poi!.id;
      const [establishment] = await source.query<{ id: string }[]>(
        `INSERT INTO establecimientos_turisticos
           (localidad_id, nombre_comercial, actividad, latitud, longitud, ubicacion)
         SELECT l.id, 'Negocio de prueba', 'OTRA ACTIVIDAD', -1.6, -79,
                ST_SetSRID(ST_MakePoint(-79, -1.6), 4326)::geography
           FROM localidades l LIMIT 1
         RETURNING id`,
      );
      establishmentId = establishment!.id;

      const roles = await source.query<{ id: string; nombre_rol: string }[]>(
        "SELECT id, nombre_rol FROM roles",
      );
      const roleId = (name: string) =>
        roles.find((role) => role.nombre_rol === name)!.id;
      touristRole = roleId("TURISTA");
      adminRole = roleId("ADMINISTRADOR");
      agentRole = roleId("AGENTE_TURISTICO");
      administrator = await legacyAccount([adminRole]);
    });

    afterAll(async () => {
      await app?.close();
      if (source?.isInitialized) await source.destroy();
    });

    describe("published documents", () => {
      it("publishes both current documents without a session", async () => {
        const reply = await call("GET", "/legal/documents");

        expect(reply.statusCode).toBe(200);
        const documents = reply.body.data as Array<Json>;
        expect(documents.map((document) => document.type)).toEqual([
          "terms",
          "privacy",
        ]);
        for (const document of documents) {
          expect(document).toEqual({
            type: expect.any(String),
            version: expect.stringMatching(/^\d{4}-\d{2}-\d{2}$/),
            title: expect.any(String),
            publishedAt: expect.any(String),
            sections: expect.any(Array),
          });
          for (const section of document.sections as Json[]) {
            expect(section).toEqual({
              heading: expect.any(String),
              body: expect.any(String),
            });
          }
        }
      });
    });

    describe("registration", () => {
      it("creates the account and one record per document in a single step", async () => {
        const before = new Date();
        const created = await registerTourist();

        expect(created.user.pendingLegalDocuments).toEqual([]);
        expect(created.user.roles).toEqual(["TURISTA"]);
        expect(created.refreshToken).toEqual(expect.any(String));
        const rows = await acceptances(created.user.id);
        expect(rows.map(({ documento, version, version_app }) => ({
          documento,
          version,
          version_app,
        }))).toEqual([
          { documento: "privacy", version: CURRENT.privacy, version_app: "1.4.0" },
          { documento: "terms", version: CURRENT.terms, version_app: "1.4.0" },
        ]);
        for (const row of rows) {
          expect(row.aceptado_en.getTime()).toBeGreaterThanOrEqual(
            before.getTime() - 5_000,
          );
          expect(row.aceptado_en.getTime()).toBeLessThanOrEqual(
            Date.now() + 5_000,
          );
        }
        const [stored] = await source.query<{ fecha_nac: string }[]>(
          "SELECT fecha_nac::text AS fecha_nac FROM usuarios WHERE id = $1",
          [created.user.id],
        );
        expect(stored!.fecha_nac).toBe("1998-02-03");
      });

      it("stores no app version when the client declares none", async () => {
        const { appVersion: _omitted, ...body } = registration();
        const reply = await call("POST", "/auth/mobile/register", { body });

        expect(reply.statusCode).toBe(201);
        const rows = await acceptances(session(reply).user.id);
        expect(rows.map((row) => row.version_app)).toEqual([null, null]);
      });

      it.each([
        ["omits one document", { acceptedLegal: { terms: CURRENT.terms } }],
        ["omits the other document", { acceptedLegal: { privacy: CURRENT.privacy } }],
        ["sends an empty acceptance", { acceptedLegal: {} }],
        ["sends a non-object acceptance", { acceptedLegal: "2026-11-07" }],
        ["sends an empty version", { acceptedLegal: { ...CURRENT, terms: "" } }],
        ["adds an unknown document", { acceptedLegal: { ...CURRENT, cookies: "x" } }],
      ])("rejects a request that %s", async (_label, overrides) => {
        const body = registration(overrides);
        const reply = await call("POST", "/auth/mobile/register", { body });

        expect(reply.statusCode).toBe(400);
        expect(reply.body.error).toMatchObject({ code: "HTTP_400" });
        expect(await countAccounts(body.email as string)).toBe(0);
      });

      it("rejects a request without any acceptance", async () => {
        const { acceptedLegal: _omitted, ...body } = registration();
        const reply = await call("POST", "/auth/mobile/register", { body });

        expect(reply.statusCode).toBe(400);
        expect(reply.body.error).toMatchObject({ code: "HTTP_400" });
        expect(await countAccounts(body.email as string)).toBe(0);
      });

      it.each(["terms", "privacy"] as const)(
        "answers a conflict for an outdated %s version",
        async (document) => {
          const body = registration({
            acceptedLegal: { ...CURRENT, [document]: OUTDATED_VERSION },
          });
          const reply = await call("POST", "/auth/mobile/register", { body });

          expect(reply.statusCode).toBe(409);
          expect(reply.body).toEqual({
            error: {
              code: "LEGAL_VERSION_OUTDATED",
              message: expect.any(String),
            },
          });
          expect(await countAccounts(body.email as string)).toBe(0);
        },
      );

      it("creates no account when the record cannot be stored", async () => {
        const body = registration();
        await withFailingTrigger("aceptaciones_legales", "TRUE", async () => {
          const reply = await call("POST", "/auth/mobile/register", { body });

          expect(reply.statusCode).toBe(500);
          expect(reply.body.error).toMatchObject({ code: "INTERNAL_ERROR" });
        });
        expect(await countAccounts(body.email as string)).toBe(0);
      });

      it("rejects a person under 15 with its own code", async () => {
        const body = registration({ birthDate: guayaquilDate(15, 1) });
        const reply = await call("POST", "/auth/mobile/register", { body });

        expect(reply.statusCode).toBe(400);
        expect(reply.body).toEqual({
          error: { code: "UNDERAGE", message: expect.any(String) },
        });
        expect(await countAccounts(body.email as string)).toBe(0);
      });

      it("accepts a person who turns 15 on the server date", async () => {
        const birthDate = guayaquilDate(15);
        const created = await registerTourist({ birthDate });

        expect(created.user.pendingLegalDocuments).toEqual([]);
        const [stored] = await source.query<{ fecha_nac: string }[]>(
          "SELECT fecha_nac::text AS fecha_nac FROM usuarios WHERE id = $1",
          [created.user.id],
        );
        expect(stored!.fecha_nac).toBe(birthDate);
      });

      it("requires the birth date", async () => {
        const { birthDate: _omitted, ...body } = registration();
        const reply = await call("POST", "/auth/mobile/register", { body });

        expect(reply.statusCode).toBe(400);
        expect(reply.body.error).toMatchObject({ code: "HTTP_400" });
        expect(await countAccounts(body.email as string)).toBe(0);
      });

      it("does not let the client set the acceptance time", async () => {
        const body = registration({ acceptedAt: "2001-01-01T00:00:00.000Z" });
        const reply = await call("POST", "/auth/mobile/register", { body });

        expect(reply.statusCode).toBe(400);
        expect(await countAccounts(body.email as string)).toBe(0);
      });

      it("limits the declared app version to 32 characters", async () => {
        const body = registration({ appVersion: "9".repeat(33) });
        const reply = await call("POST", "/auth/mobile/register", { body });

        expect(reply.statusCode).toBe(400);
        expect(await countAccounts(body.email as string)).toBe(0);
      });

      it("keeps the previous validation and duplicate behavior", async () => {
        const created = await registerTourist();

        const duplicate = await call("POST", "/auth/mobile/register", {
          body: registration({ email: created.email.toUpperCase() }),
        });
        expect(duplicate.statusCode).toBe(400);
        expect(duplicate.body).toEqual({
          error: {
            code: "HTTP_400",
            message: "No se pudo crear la cuenta con esos datos.",
          },
        });

        const gender = await call("POST", "/auth/mobile/register", {
          body: registration({ gender: "No binario" }),
        });
        expect(gender.statusCode).toBe(400);
        expect(gender.body.error).toMatchObject({ code: "HTTP_400" });

        const shortPassword = await call("POST", "/auth/mobile/register", {
          body: registration({ password: "corta" }),
        });
        expect(shortPassword.statusCode).toBe(400);

        const future = await call("POST", "/auth/mobile/register", {
          body: registration({ birthDate: "2999-01-01" }),
        });
        expect(future.statusCode).toBe(400);
        expect(future.body).toEqual({
          error: {
            code: "HTTP_400",
            message: "La fecha de nacimiento no es válida.",
          },
        });

        const impossible = await call("POST", "/auth/mobile/register", {
          body: registration({ birthDate: "1998-02-31" }),
        });
        expect(impossible.statusCode).toBe(400);
        expect(impossible.body.error).toMatchObject({
          message: "La fecha de nacimiento no es válida.",
        });
      });
    });

    describe("login regression", () => {
      it("keeps login success and failure as they were", async () => {
        const created = await registerTourist();

        const success = await login(created.email.toUpperCase());
        expect(success.statusCode).toBe(200);
        expect(Object.keys(success.body.data as Json).sort()).toEqual([
          "accessToken",
          "refreshToken",
          "user",
        ]);
        expect(session(success).user).toEqual({
          id: created.user.id,
          name: "Ana Pérez",
          email: created.email,
          roles: ["TURISTA"],
          pendingLegalDocuments: [],
        });

        const wrong = await login(created.email, "otra-clave-incorrecta");
        const unknown = await login(email("nadie"));
        const expected = {
          error: {
            code: "HTTP_401",
            message: "Correo o contraseña inválidos.",
          },
        };
        expect(wrong.statusCode).toBe(401);
        expect(wrong.body).toEqual(expected);
        expect(unknown.statusCode).toBe(401);
        expect(unknown.body).toEqual(expected);
      });
    });

    describe("pending documents in the session", () => {
      it("leaves pre-existing accounts without records", async () => {
        const account = await legacyAccount([touristRole]);

        expect(await acceptances(account.id)).toEqual([]);
      });

      it("reports both documents on every session path of an account without records", async () => {
        const account = await legacyAccount([touristRole]);
        const pending = ["terms", "privacy"];

        const mobile = await login(account.email);
        expect(session(mobile).user.pendingLegalDocuments).toEqual(pending);

        const web = await call("POST", "/auth/login", {
          body: { email: account.email, password: PASSWORD },
        });
        expect(
          (web.body.data as Session).user.pendingLegalDocuments,
        ).toEqual(pending);

        const me = await call("GET", "/auth/me", {
          token: session(mobile).accessToken,
        });
        expect(
          (me.body.data as { user: Session["user"] }).user
            .pendingLegalDocuments,
        ).toEqual(pending);

        const refreshed = await call("POST", "/auth/mobile/refresh", {
          body: { refreshToken: session(mobile).refreshToken },
        });
        expect(session(refreshed).user.pendingLegalDocuments).toEqual(pending);
      });

      it("reports only the document with a newer version", async () => {
        const created = await registerTourist();
        await source.query(
          "UPDATE aceptaciones_legales SET version = $2 WHERE usuario_id = $1 AND documento = 'privacy'",
          [created.user.id, OUTDATED_VERSION],
        );

        const reply = await login(created.email);

        expect(session(reply).user.pendingLegalDocuments).toEqual(["privacy"]);
      });

      it.each([
        ["an administrator", () => [adminRole]],
        ["a tourism agent", () => [agentRole]],
        ["a tourist with an institutional role", () => [touristRole, agentRole]],
      ])("never reports documents to %s", async (_label, roles) => {
        const account = await legacyAccount(roles());

        const reply = await login(account.email);
        expect(session(reply).user.pendingLegalDocuments).toEqual([]);

        const me = await call("GET", "/auth/me", {
          token: session(reply).accessToken,
        });
        expect(
          (me.body.data as { user: Session["user"] }).user
            .pendingLegalDocuments,
        ).toEqual([]);

        const refreshed = await call("POST", "/auth/mobile/refresh", {
          body: { refreshToken: session(reply).refreshToken },
        });
        expect(session(refreshed).user.pendingLegalDocuments).toEqual([]);
      });
    });

    describe("POST /auth/legal-acceptances", () => {
      async function legacySession() {
        const account = await legacyAccount([touristRole]);
        return { account, tokens: session(await login(account.email)) };
      }

      it("stores the records and clears the pending documents", async () => {
        const { account, tokens } = await legacySession();

        const reply = await call("POST", "/auth/legal-acceptances", {
          token: tokens.accessToken,
          body: { acceptedLegal: CURRENT, appVersion: "1.5.0" },
        });

        expect(reply.statusCode).toBe(200);
        expect(reply.body).toEqual({ data: { pendingLegalDocuments: [] } });
        const rows = await acceptances(account.id);
        expect(rows.map((row) => [row.documento, row.version_app])).toEqual([
          ["privacy", "1.5.0"],
          ["terms", "1.5.0"],
        ]);
        expect(
          session(await login(account.email)).user.pendingLegalDocuments,
        ).toEqual([]);
      });

      it("accepts one document at a time and reports the other", async () => {
        const { account, tokens } = await legacySession();

        const reply = await call("POST", "/auth/legal-acceptances", {
          token: tokens.accessToken,
          body: { acceptedLegal: { terms: CURRENT.terms } },
        });

        expect(reply.statusCode).toBe(200);
        expect(reply.body).toEqual({
          data: { pendingLegalDocuments: ["privacy"] },
        });
        const rows = await acceptances(account.id);
        expect(rows.map((row) => row.documento)).toEqual(["terms"]);
        expect(rows[0]!.version_app).toBeNull();
      });

      it("adds a record for a new version and keeps the previous one", async () => {
        const { account, tokens } = await legacySession();
        await source.query(
          `INSERT INTO aceptaciones_legales (usuario_id, documento, version, aceptado_en)
           VALUES ($1, 'terms', $2, '2025-01-01T00:00:00Z')`,
          [account.id, OUTDATED_VERSION],
        );

        const reply = await call("POST", "/auth/legal-acceptances", {
          token: tokens.accessToken,
          body: { acceptedLegal: { terms: CURRENT.terms } },
        });

        expect(reply.statusCode).toBe(200);
        const rows = await acceptances(account.id);
        expect(rows.map((row) => row.version)).toEqual([
          OUTDATED_VERSION,
          CURRENT.terms,
        ]);
        expect(rows[0]!.aceptado_en.toISOString()).toBe(
          "2025-01-01T00:00:00.000Z",
        );
      });

      it("keeps one record when the same acceptance repeats", async () => {
        const { account, tokens } = await legacySession();
        const request = {
          token: tokens.accessToken,
          body: { acceptedLegal: CURRENT },
        };

        const first = await call("POST", "/auth/legal-acceptances", request);
        const stored = await acceptances(account.id);
        const second = await call("POST", "/auth/legal-acceptances", {
          ...request,
          body: { acceptedLegal: CURRENT, appVersion: "9.9.9" },
        });

        expect(first.statusCode).toBe(200);
        expect(second.statusCode).toBe(200);
        expect(second.body).toEqual({ data: { pendingLegalDocuments: [] } });
        expect(await acceptances(account.id)).toEqual(stored);
      });

      it("keeps one record when the same acceptance arrives at once", async () => {
        const { account, tokens } = await legacySession();
        const request = {
          token: tokens.accessToken,
          body: { acceptedLegal: CURRENT },
        };

        const replies = await Promise.all(
          Array.from({ length: 6 }, () =>
            call("POST", "/auth/legal-acceptances", request),
          ),
        );

        expect(replies.map((reply) => reply.statusCode)).toEqual(
          Array(6).fill(200),
        );
        for (const reply of replies) {
          expect(reply.body).toEqual({ data: { pendingLegalDocuments: [] } });
        }
        expect(await acceptances(account.id)).toHaveLength(2);
      });

      it("rejects a request without a valid token", async () => {
        const { account } = await legacySession();

        const missing = await call("POST", "/auth/legal-acceptances", {
          body: { acceptedLegal: CURRENT },
        });
        const invalid = await call("POST", "/auth/legal-acceptances", {
          token: "not-a-token",
          body: { acceptedLegal: CURRENT },
        });

        expect(missing.statusCode).toBe(401);
        expect(invalid.statusCode).toBe(401);
        expect(await acceptances(account.id)).toEqual([]);
      });

      it("stores nothing when any declared version is outdated", async () => {
        const { account, tokens } = await legacySession();

        const reply = await call("POST", "/auth/legal-acceptances", {
          token: tokens.accessToken,
          body: {
            acceptedLegal: { terms: CURRENT.terms, privacy: OUTDATED_VERSION },
          },
        });

        expect(reply.statusCode).toBe(409);
        expect(reply.body).toEqual({
          error: {
            code: "LEGAL_VERSION_OUTDATED",
            message: expect.any(String),
          },
        });
        expect(await acceptances(account.id)).toEqual([]);
      });

      it("requires at least one document", async () => {
        const { account, tokens } = await legacySession();

        const reply = await call("POST", "/auth/legal-acceptances", {
          token: tokens.accessToken,
          body: { acceptedLegal: {} },
        });

        expect(reply.statusCode).toBe(400);
        expect(reply.body.error).toMatchObject({ code: "HTTP_400" });
        expect(await acceptances(account.id)).toEqual([]);
      });

      it("does not open a route that updates or deletes records", async () => {
        const { tokens } = await legacySession();

        for (const method of ["PUT", "PATCH", "DELETE"] as const) {
          const response = await app.inject({
            method,
            url: "/api/v1/auth/legal-acceptances",
            headers: { authorization: `Bearer ${tokens.accessToken}` },
          });
          expect(response.statusCode).toBe(404);
        }
      });
    });

    describe("GET /admin/users", () => {
      async function adminToken() {
        return session(await login(administrator.email)).accessToken;
      }

      async function listed(token: string, address: string) {
        const reply = await call(
          "GET",
          `/admin/users?q=${encodeURIComponent(address)}`,
          { token },
        );
        expect(reply.statusCode).toBe(200);
        return (reply.body.data as { items: Json[] }).items[0]!;
      }

      it("shows the state of an up-to-date tourist", async () => {
        const created = await registerTourist();
        const stored = await acceptances(created.user.id);

        const item = await listed(await adminToken(), created.email);

        expect(item.legalAcceptance).toEqual({
          upToDate: true,
          terms: {
            version: CURRENT.terms,
            acceptedAt: stored
              .find((row) => row.documento === "terms")!
              .aceptado_en.toISOString(),
          },
          privacy: {
            version: CURRENT.privacy,
            acceptedAt: stored
              .find((row) => row.documento === "privacy")!
              .aceptado_en.toISOString(),
          },
        });
      });

      it("shows a tourist without records as not up to date", async () => {
        const account = await legacyAccount([touristRole]);

        const item = await listed(await adminToken(), account.email);

        expect(item.legalAcceptance).toEqual({
          upToDate: false,
          terms: null,
          privacy: null,
        });
      });

      it("shows the latest accepted version of an outdated tourist", async () => {
        const account = await legacyAccount([touristRole]);
        await source.query(
          `INSERT INTO aceptaciones_legales (usuario_id, documento, version, aceptado_en)
           VALUES ($1, 'terms', '2019-01-01', '2019-01-01T00:00:00Z'),
                  ($1, 'terms', $2, '2025-01-01T00:00:00Z')`,
          [account.id, OUTDATED_VERSION],
        );

        const item = await listed(await adminToken(), account.email);

        expect(item.legalAcceptance).toEqual({
          upToDate: false,
          terms: {
            version: OUTDATED_VERSION,
            acceptedAt: "2025-01-01T00:00:00.000Z",
          },
          privacy: null,
        });
      });

      it("shows null for institutional accounts", async () => {
        const token = await adminToken();
        const agent = await legacyAccount([agentRole]);
        const mixed = await legacyAccount([touristRole, agentRole]);

        expect((await listed(token, administrator.email)).legalAcceptance).toBeNull();
        expect((await listed(token, agent.email)).legalAcceptance).toBeNull();
        expect((await listed(token, mixed.email)).legalAcceptance).toBeNull();
      });

      it.each([
        ["a tourist", () => [touristRole]],
        ["a tourism agent", () => [agentRole]],
      ])("rejects %s without revealing acceptance data", async (_label, roles) => {
        const account = await legacyAccount(roles());
        const { accessToken } = session(await login(account.email));

        const reply = await call("GET", "/admin/users", { token: accessToken });

        expect(reply.statusCode).toBe(403);
        expect(reply.body).toEqual({
          error: {
            code: "HTTP_403",
            message: "No tienes permisos para esta operación.",
          },
        });
      });

      it("rejects a request without a session", async () => {
        const reply = await call("GET", "/admin/users");

        expect(reply.statusCode).toBe(401);
        expect(JSON.stringify(reply.body)).not.toContain("legalAcceptance");
      });
    });

    describe("POST /auth/account/delete", () => {
      async function deleteAccount(token: string, password = PASSWORD) {
        return call("POST", "/auth/account/delete", {
          token,
          body: { password },
        });
      }

      async function countOwned(userId: number) {
        const counts: Record<string, number> = {};
        for (const { table_name, column_name } of await foreignKeysToUsuarios()) {
          const rows = await source.query<{ total: number }[]>(
            `SELECT COUNT(*)::int AS total FROM ${table_name} WHERE ${column_name} = $1`,
            [userId],
          );
          if (rows[0]!.total > 0) {
            counts[`${table_name}.${column_name}`] = rows[0]!.total;
          }
        }
        return counts;
      }

      it("anonymizes the account, removes its data and keeps the records", async () => {
        const created = await registerTourist();
        await seedOwnedData(created.user.id);
        const before = await acceptances(created.user.id);

        const reply = await deleteAccount(created.accessToken);

        expect(reply.statusCode).toBe(200);
        expect(reply.body).toEqual({ data: { deleted: true } });
        const row = await accountRow(created.user.id);
        expect(row).toMatchObject({
          nombre: ACCOUNT_DELETED_NAME,
          genero: null,
          fecha_nac: null,
          activo: false,
          email_verified_at: null,
          remember_token: null,
        });
        expect(row.eliminado_at).toBeInstanceOf(Date);
        expect(row.email).toMatch(
          /^eliminada-[0-9a-f-]{36}@cuenta-eliminada\.invalid$/,
        );
        expect(row.password).not.toMatch(/^\$argon2/);
        expect(JSON.stringify(row)).not.toContain(created.email);
        expect(JSON.stringify(row)).not.toContain("Ana");
        expect(await acceptances(created.user.id)).toEqual(before);
      });

      it("walks the real foreign keys and leaves only the classified references", async () => {
        const classified = Object.values(USUARIOS_REFERENCES)
          .flat()
          .slice()
          .sort();
        const real = (await foreignKeysToUsuarios())
          .map((fk) => `${fk.table_name}.${fk.column_name}`)
          .sort();

        // A new table with a FK to usuarios fails here until it is classified.
        expect(real).toEqual(classified);

        const created = await registerTourist();
        const { itineraryId, dayId } = await seedOwnedData(created.user.id);
        const opinion = await seedOpinion(created.user.id, [
          { rating: 4, comment: "Texto", status: "APROBADA" },
        ]);
        const seeded = await countOwned(created.user.id);
        for (const reference of [
          ...USUARIOS_REFERENCES.deleted,
          ...USUARIOS_REFERENCES.anonymized,
        ]) {
          expect(seeded[reference], reference).toBeGreaterThan(0);
        }

        const reply = await deleteAccount(created.accessToken);
        expect(reply.statusCode).toBe(200);

        expect(await countOwned(created.user.id)).toEqual({
          "aceptaciones_legales.usuario_id": 2,
          "opiniones.usuario_id": 1,
          "usuarios_roles.usuario_id": 1,
        });
        const dependents = await source.query<{ total: number }[]>(
          `SELECT (SELECT COUNT(*) FROM itinerario_jornadas WHERE itinerario_id = $1)
                + (SELECT COUNT(*) FROM itinerario_paradas WHERE jornada_id = $2)
                + (SELECT COUNT(*) FROM mensajes_ia m
                     JOIN conversaciones_ia c ON c.id = m.conversacion_id
                    WHERE c.usuario_id = $3) AS total`,
          [itineraryId, dayId, created.user.id],
        );
        expect(Number(dependents[0]!.total)).toBe(0);
        const [stored] = await source.query<{ eliminado_at: Date | null }[]>(
          "SELECT eliminado_at FROM opiniones WHERE id = $1",
          [opinion],
        );
        expect(stored!.eliminado_at).toBeInstanceOf(Date);
      });

      it("erases the text of every opinion version and respects the table checks", async () => {
        await removeOpinionFixtures();
        const created = await registerTourist();
        const opinion = await seedOpinion(
          created.user.id,
          [
            { rating: 5, comment: "Primera versión", status: "REEMPLAZADA" },
            { rating: null, comment: "Solo comentario", status: "RECHAZADA" },
            { rating: 3, comment: "Versión pública", status: "APROBADA" },
            { rating: 2, comment: "Pendiente", status: "PENDIENTE" },
          ],
          "El comentario decía «Primera versión»",
        );

        const reply = await deleteAccount(created.accessToken);
        expect(reply.statusCode).toBe(200);

        const versions = await source.query<
          { calificacion: number | null; comentario: string | null }[]
        >(
          `SELECT calificacion, comentario FROM opinion_versiones
            WHERE opinion_id = $1 ORDER BY numero_version`,
          [opinion],
        );
        expect(versions).toEqual([
          { calificacion: 5, comentario: null },
          { calificacion: null, comentario: ERASED_OPINION_COMMENT },
          { calificacion: 3, comentario: null },
          { calificacion: 2, comentario: null },
        ]);
        const moderations = await source.query<{ motivo: string | null }[]>(
          "SELECT motivo FROM moderaciones_opinion WHERE opinion_id = $1",
          [opinion],
        );
        expect(moderations).toHaveLength(4);
        expect(moderations.every((row) => row.motivo === null)).toBe(true);
      });

      it("keeps the deletion date of an opinion already removed by moderation", async () => {
        const created = await registerTourist();
        const opinion = await seedOpinion(created.user.id, [
          { rating: 1, comment: "Retirada", status: "APROBADA" },
        ]);
        await source.query(
          "UPDATE opiniones SET eliminado_at = '2026-01-01T00:00:00Z' WHERE id = $1",
          [opinion],
        );

        await deleteAccount(created.accessToken);

        const [row] = await source.query<{ eliminado_at: Date }[]>(
          "SELECT eliminado_at FROM opiniones WHERE id = $1",
          [opinion],
        );
        expect(row!.eliminado_at.toISOString()).toBe(
          "2026-01-01T00:00:00.000Z",
        );
        const [version] = await source.query<{ comentario: string | null }[]>(
          "SELECT comentario FROM opinion_versiones WHERE opinion_id = $1",
          [opinion],
        );
        expect(version!.comentario).toBeNull();
      });

      it("removes approved opinions from the public ratings", async () => {
        await removeOpinionFixtures();
        const leaving = await registerTourist();
        const staying = await registerTourist();
        await seedOpinion(leaving.user.id, [
          { rating: 1, comment: "Mala", status: "APROBADA" },
        ]);
        await seedOpinion(staying.user.id, [
          { rating: 5, comment: "Buena", status: "APROBADA" },
        ]);
        const before = await opinions.listPublished(centerCode, 20, 0);
        expect(before.summary).toMatchObject({
          totalRatings: 2,
          averageRating: 3,
        });

        const reply = await deleteAccount(leaving.accessToken);
        expect(reply.statusCode).toBe(200);

        const after = await opinions.listPublished(centerCode, 20, 0);
        expect(after.summary).toMatchObject({
          totalRatings: 1,
          averageRating: 5,
        });
        expect(after.items.map((item) => item.comment)).toEqual(["Buena"]);
      });

      it("rejects a wrong password with a code and changes nothing", async () => {
        const created = await registerTourist();
        await seedOwnedData(created.user.id);
        const account = await accountRow(created.user.id);
        const owned = await countOwned(created.user.id);

        const reply = await deleteAccount(
          created.accessToken,
          "otra-clave-incorrecta",
        );

        expect(reply.statusCode).toBe(400);
        expect(reply.body).toEqual({
          error: { code: "INVALID_PASSWORD", message: expect.any(String) },
        });
        expect(await accountRow(created.user.id)).toEqual(account);
        expect(await countOwned(created.user.id)).toEqual(owned);
        expect((await login(created.email)).statusCode).toBe(200);
      });

      it("rejects a request without a valid token", async () => {
        const created = await registerTourist();
        const account = await accountRow(created.user.id);

        const missing = await call("POST", "/auth/account/delete", {
          body: { password: PASSWORD },
        });
        const invalid = await call("POST", "/auth/account/delete", {
          token: "not-a-token",
          body: { password: PASSWORD },
        });

        expect(missing.statusCode).toBe(401);
        expect(invalid.statusCode).toBe(401);
        expect(await accountRow(created.user.id)).toEqual(account);
      });

      it("requires the password field", async () => {
        const created = await registerTourist();

        const reply = await call("POST", "/auth/account/delete", {
          token: created.accessToken,
          body: {},
        });

        expect(reply.statusCode).toBe(400);
        expect(reply.body.error).toMatchObject({ code: "HTTP_400" });
        expect((await accountRow(created.user.id)).eliminado_at).toBeNull();
      });

      it.each([
        ["an administrator", () => [adminRole]],
        ["a tourism agent", () => [agentRole]],
        ["a tourist with an institutional role", () => [touristRole, agentRole]],
        ["an account without roles", () => []],
      ])("rejects %s and changes nothing", async (_label, roles) => {
        const account = await legacyAccount(roles());
        const tokens = session(await login(account.email));
        const before = await accountRow(account.id);

        const reply = await deleteAccount(tokens.accessToken);

        expect(reply.statusCode).toBe(403);
        expect(reply.body).toEqual({
          error: {
            code: "ACCOUNT_NOT_DELETABLE",
            message: expect.any(String),
          },
        });
        expect(await accountRow(account.id)).toEqual(before);
      });

      it("reads the roles from the account, not from the token", async () => {
        const created = await registerTourist();
        await source.query(
          "INSERT INTO usuarios_roles (rol_id, usuario_id) VALUES ($1, $2)",
          [agentRole, created.user.id],
        );

        const reply = await deleteAccount(created.accessToken);

        expect(reply.statusCode).toBe(403);
        expect((await accountRow(created.user.id)).activo).toBe(true);
      });

      it("deletes once when two valid requests arrive at once", async () => {
        const created = await registerTourist();
        await seedOwnedData(created.user.id);

        const replies = await Promise.all([
          deleteAccount(created.accessToken),
          deleteAccount(created.accessToken),
        ]);

        const statuses = replies.map((reply) => reply.statusCode).sort();
        expect(statuses).toEqual([200, 401]);
        const row = await accountRow(created.user.id);
        const deletedAt = (row.eliminado_at as Date).toISOString();
        expect(row.activo).toBe(false);

        const repeated = await deleteAccount(created.accessToken);
        expect(repeated.statusCode).toBe(401);
        const after = await accountRow(created.user.id);
        expect((after.eliminado_at as Date).toISOString()).toBe(deletedAt);
        expect(after.email).toBe(row.email);
      });

      it("applies nothing when a step fails", async () => {
        const created = await registerTourist();
        await seedOwnedData(created.user.id);
        const opinion = await seedOpinion(created.user.id, [
          { rating: 4, comment: "Conservada", status: "APROBADA" },
        ]);
        const account = await accountRow(created.user.id);
        const owned = await countOwned(created.user.id);

        await withFailingTrigger(
          "usuarios",
          "NEW.eliminado_at IS NOT NULL",
          async () => {
            const reply = await deleteAccount(created.accessToken);

            expect(reply.statusCode).toBe(500);
            expect(reply.body.error).toMatchObject({ code: "INTERNAL_ERROR" });
          },
        );

        expect(await accountRow(created.user.id)).toEqual(account);
        expect(await countOwned(created.user.id)).toEqual(owned);
        const [version] = await source.query<{ comentario: string }[]>(
          "SELECT comentario FROM opinion_versiones WHERE opinion_id = $1",
          [opinion],
        );
        expect(version!.comentario).toBe("Conservada");
        expect((await login(created.email)).statusCode).toBe(200);
      });

      it("blocks login with the previous credentials", async () => {
        const created = await registerTourist();

        await deleteAccount(created.accessToken);
        const reply = await login(created.email);

        expect(reply.statusCode).toBe(401);
        expect(reply.body).toEqual({
          error: {
            code: "HTTP_401",
            message: "Correo o contraseña inválidos.",
          },
        });
      });

      it("rejects a session issued before the deletion", async () => {
        const created = await registerTourist();
        const second = session(await login(created.email));

        await deleteAccount(created.accessToken);

        for (const refreshToken of [
          created.refreshToken,
          second.refreshToken,
        ]) {
          const reply = await call("POST", "/auth/mobile/refresh", {
            body: { refreshToken },
          });
          expect(reply.statusCode).toBe(401);
        }
        const [sessions] = await source.query<{ total: number }[]>(
          "SELECT COUNT(*)::int AS total FROM auth_sessions WHERE usuario_id = $1",
          [created.user.id],
        );
        expect(sessions!.total).toBe(0);
      });

      it("leaves no renewable session when a refresh races the deletion", async () => {
        for (let round = 0; round < 5; round += 1) {
          const created = await registerTourist();

          const [deleted, refreshed] = await Promise.all([
            deleteAccount(created.accessToken),
            call("POST", "/auth/mobile/refresh", {
              body: { refreshToken: created.refreshToken },
            }),
          ]);

          expect(deleted.statusCode).toBe(200);
          expect([200, 401]).toContain(refreshed.statusCode);
          const renewed =
            refreshed.statusCode === 200
              ? session(refreshed).refreshToken
              : created.refreshToken;
          const again = await call("POST", "/auth/mobile/refresh", {
            body: { refreshToken: renewed },
          });
          expect(again.statusCode).toBe(401);
          const [sessions] = await source.query<{ total: number }[]>(
            "SELECT COUNT(*)::int AS total FROM auth_sessions WHERE usuario_id = $1",
            [created.user.id],
          );
          expect(sessions!.total).toBe(0);
        }
      });

      it("rejects an access token issued before the deletion", async () => {
        const created = await registerTourist();

        await deleteAccount(created.accessToken);

        const me = await call("GET", "/auth/me", {
          token: created.accessToken,
        });
        const accept = await call("POST", "/auth/legal-acceptances", {
          token: created.accessToken,
          body: { acceptedLegal: CURRENT },
        });
        expect(me.statusCode).toBe(401);
        expect(accept.statusCode).toBe(401);
        expect(await acceptances(created.user.id)).toHaveLength(2);
      });

      it("frees the email for an unrelated new account", async () => {
        const first = await registerTourist();
        await seedOwnedData(first.user.id);
        await deleteAccount(first.accessToken);

        const second = await registerTourist({ email: first.email });

        expect(second.user.id).not.toBe(first.user.id);
        expect(second.user.email).toBe(first.email);
        expect(await countOwned(second.user.id)).toEqual({
          "aceptaciones_legales.usuario_id": 2,
          "auth_sessions.usuario_id": 1,
          "usuarios_roles.usuario_id": 1,
        });
        expect(await acceptances(first.user.id)).toHaveLength(2);
      });

      it("holds the email indexes across several deleted accounts", async () => {
        const first = await registerTourist();
        const second = await registerTourist();

        const replies = await Promise.all([
          deleteAccount(first.accessToken),
          deleteAccount(second.accessToken),
        ]);

        expect(replies.map((reply) => reply.statusCode)).toEqual([200, 200]);
        const [left, right] = [
          await accountRow(first.user.id),
          await accountRow(second.user.id),
        ];
        expect(left.email).not.toBe(right.email);
      });

      it("cannot be reactivated by the database once deleted", async () => {
        const created = await registerTourist();
        await deleteAccount(created.accessToken);

        await expect(
          source.query("UPDATE usuarios SET activo = TRUE WHERE id = $1", [
            created.user.id,
          ]),
        ).rejects.toThrow("usuarios_eliminado_inactivo_check");
      });

      it("keeps showing the anonymized account in the institutional list", async () => {
        const created = await registerTourist();
        await deleteAccount(created.accessToken);
        const row = await accountRow(created.user.id);
        const { accessToken } = session(await login(administrator.email));

        const reply = await call(
          "GET",
          `/admin/users?q=${encodeURIComponent(row.email as string)}`,
          { token: accessToken },
        );

        const items = (reply.body.data as { items: Json[] }).items;
        expect(items).toHaveLength(1);
        expect(items[0]).toMatchObject({
          name: ACCOUNT_DELETED_NAME,
          active: false,
          roles: ["TURISTA"],
          legalAcceptance: { upToDate: true },
        });
      });
    });
  },
);
