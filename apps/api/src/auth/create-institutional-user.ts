import "reflect-metadata";

import { ConfigService } from "@nestjs/config";
import { DataSource } from "typeorm";

import { validateEnvironment } from "../config/environment";
import { PasswordService } from "./password.service";

async function main(): Promise<void> {
  const email = process.env.AUTH_BOOTSTRAP_EMAIL?.trim().toLowerCase();
  const name = process.env.AUTH_BOOTSTRAP_NAME?.trim();
  const password = process.env.AUTH_BOOTSTRAP_PASSWORD;
  if (!email || !name || !password || password.length < 12) {
    throw new Error(
      "Define AUTH_BOOTSTRAP_EMAIL, AUTH_BOOTSTRAP_NAME y AUTH_BOOTSTRAP_PASSWORD (mínimo 12 caracteres).",
    );
  }

  const environment = validateEnvironment(process.env);
  const config = new ConfigService(environment);
  const dataSource = new DataSource({
    type: "postgres",
    url: config.getOrThrow<string>("DATABASE_URL"),
  });
  await dataSource.initialize();

  try {
    const passwordHash = await new PasswordService().hash(password);
    await dataSource.transaction(async (manager) => {
      const existing = (await manager.query(
        "SELECT id FROM usuarios WHERE lower(email) = $1",
        [email],
      )) as { id: string }[];
      if (existing[0]) {
        throw new Error("Ya existe un usuario con ese correo.");
      }
      const users = (await manager.query(
        `INSERT INTO usuarios (nombre, email, password, activo, email_verified_at)
         VALUES ($1, $2, $3, TRUE, CURRENT_TIMESTAMP)
         RETURNING id`,
        [name, email, passwordHash],
      )) as { id: string }[];
      const roles = (await manager.query(
        "SELECT id FROM roles WHERE nombre_rol = 'ADMINISTRADOR'",
      )) as { id: string }[];
      if (!roles[0]) {
        throw new Error(
          "El rol ADMINISTRADOR no está configurado en el baseline.",
        );
      }
      await manager.query(
        "INSERT INTO usuarios_roles (rol_id, usuario_id) VALUES ($1, $2)",
        [roles[0].id, users[0].id],
      );
    });
    console.log(`Usuario institucional creado: ${email}`);
  } finally {
    await dataSource.destroy();
  }
}

void main().catch((error: unknown) => {
  console.error(
    error instanceof Error ? error.message : "No se pudo crear el usuario.",
  );
  process.exitCode = 1;
});
