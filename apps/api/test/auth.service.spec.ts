import { createHash, randomUUID } from "node:crypto";

import { describe, expect, it, vi } from "vitest";

import { AuthService } from "../src/auth/auth.service";

describe("AuthService refresh rotation", () => {
  it("rejects a gender outside the Ecuador registration options", async () => {
    const dataSource = { transaction: vi.fn() };
    const service = new AuthService(
      dataSource as never,
      { hash: vi.fn() } as never,
      {} as never,
      {} as never,
    );

    await expect(
      service.register({
        email: "tourist@example.com",
        gender: "No binario",
        name: "Turista",
        password: "a-secure-password",
      }),
    ).rejects.toThrow("Los datos de la cuenta no son válidos.");
    expect(dataSource.transaction).not.toHaveBeenCalled();
  });

  it("creates an active tourist session with normalized account data", async () => {
    const query = vi.fn(async (sql: string) => {
      if (sql.includes("INSERT INTO usuarios")) return [{ id: "8" }];
      if (sql.includes("SELECT id FROM roles")) return [{ id: "2" }];
      if (sql.includes("FROM usuarios u")) {
        return [
          {
            id: "8",
            name: "Ana Pérez",
            email: "ana@example.com",
            password: "hash",
            active: true,
            roles: ["TURISTA"],
          },
        ];
      }
      return [];
    });
    const manager = { query };
    const dataSource = {
      manager,
      transaction: vi.fn(async (callback: (value: typeof manager) => unknown) =>
        callback(manager),
      ),
    };
    const service = new AuthService(
      dataSource as never,
      { hash: vi.fn().mockResolvedValue("hashed-password") } as never,
      { signAccessToken: vi.fn().mockResolvedValue("access-token") } as never,
      { getOrThrow: vi.fn().mockReturnValue(30) } as never,
    );

    await expect(
      service.register({
        birthDate: "1998-02-03",
        email: "  ANA@EXAMPLE.COM ",
        gender: "Femenino",
        name: " Ana   Pérez ",
        password: "a-secure-password",
      }),
    ).resolves.toMatchObject({
      accessToken: "access-token",
      user: { email: "ana@example.com", roles: ["TURISTA"] },
    });
    expect(query).toHaveBeenCalledWith(
      expect.stringContaining("INSERT INTO usuarios"),
      [
        "Ana Pérez",
        "ana@example.com",
        "Femenino",
        "1998-02-03",
        "hashed-password",
      ],
    );
    expect(query).toHaveBeenCalledWith(
      expect.stringContaining("INSERT INTO usuarios_roles"),
      ["2", "8"],
    );
  });

  it("does not expose whether a registration email already exists", async () => {
    const dataSource = {
      transaction: vi.fn().mockRejectedValue({ code: "23505" }),
    };
    const service = new AuthService(
      dataSource as never,
      { hash: vi.fn().mockResolvedValue("hashed-password") } as never,
      {} as never,
      {} as never,
    );

    await expect(
      service.register({
        email: "taken@example.com",
        gender: "Femenino",
        name: "Ana",
        password: "a-secure-password",
      }),
    ).rejects.toThrow("No se pudo crear la cuenta con esos datos.");
  });

  it("does not propagate retired institutional roles into the session", async () => {
    const query = vi.fn().mockResolvedValue([
      {
        id: "7",
        name: "Josue",
        email: "josue@mail.com",
        password: "hash",
        active: true,
        roles: ["GESTOR", "TURISTA"],
      },
    ]);
    const dataSource = { query, manager: { query } };
    const service = new AuthService(
      dataSource as never,
      {} as never,
      {} as never,
      {} as never,
    );

    await expect(service.findUserById(7)).resolves.toMatchObject({
      roles: ["TURISTA"],
    });
  });

  it("inserts the replacement session before linking the old session", async () => {
    const tokenId = randomUUID();
    const rawToken = `${tokenId}.${"a".repeat(43)}`;
    const tokenHash = createHash("sha256").update(rawToken).digest("hex");
    const query = vi.fn(async (sql: string) => {
      if (sql.includes("FROM auth_sessions")) {
        return [
          {
            token_id: tokenId,
            family_id: randomUUID(),
            usuario_id: "7",
            token_hash: tokenHash,
            expires_at: new Date(Date.now() + 60_000),
            revoked_at: null,
            replaced_by_token_id: null,
          },
        ];
      }
      if (sql.includes("FROM usuarios u")) {
        return [
          {
            id: "7",
            name: "Josue",
            email: "josue@mail.com",
            password: "hash",
            active: true,
            roles: ["ADMINISTRADOR"],
          },
        ];
      }
      return [];
    });
    const manager = { query };
    const dataSource = {
      transaction: vi.fn(async (callback: (value: typeof manager) => unknown) =>
        callback(manager),
      ),
    };
    const service = new AuthService(
      dataSource as never,
      {} as never,
      { signAccessToken: vi.fn().mockResolvedValue("access-token") } as never,
      { getOrThrow: vi.fn().mockReturnValue(30) } as never,
    );

    await expect(service.refresh(rawToken)).resolves.toMatchObject({
      accessToken: "access-token",
      user: { email: "josue@mail.com", roles: ["ADMINISTRADOR"] },
    });

    const queryText = query.mock.calls.map(([sql]) => sql);
    expect(
      queryText.findIndex((sql) => sql.includes("INSERT INTO auth_sessions")),
    ).toBe(2);
    expect(
      queryText.findIndex((sql) => sql.includes("UPDATE auth_sessions")),
    ).toBe(3);
  });

  it("does not revoke the family during an immediate concurrent refresh", async () => {
    const tokenId = randomUUID();
    const replacementId = randomUUID();
    const rawToken = `${tokenId}.${"b".repeat(43)}`;
    const tokenHash = createHash("sha256").update(rawToken).digest("hex");
    const query = vi.fn(async (sql: string) => {
      if (sql.includes("FROM auth_sessions")) {
        return [
          {
            token_id: tokenId,
            family_id: randomUUID(),
            usuario_id: "7",
            token_hash: tokenHash,
            expires_at: new Date(Date.now() + 60_000),
            revoked_at: new Date(Date.now() - 1_000),
            replaced_by_token_id: replacementId,
          },
        ];
      }
      if (sql.includes("FROM usuarios u")) {
        return [
          {
            id: "7",
            name: "Josue",
            email: "josue@mail.com",
            password: "hash",
            active: true,
            roles: ["ADMINISTRADOR"],
          },
        ];
      }
      return [];
    });
    const manager = { query };
    const dataSource = {
      transaction: vi.fn(async (callback: (value: typeof manager) => unknown) =>
        callback(manager),
      ),
    };
    const service = new AuthService(
      dataSource as never,
      {} as never,
      { signAccessToken: vi.fn().mockResolvedValue("access-token") } as never,
      { getOrThrow: vi.fn().mockReturnValue(30) } as never,
    );

    await expect(service.refresh(rawToken)).resolves.toMatchObject({
      accessToken: "access-token",
      user: { email: "josue@mail.com" },
    });
    expect(
      query.mock.calls.some(([sql]) => sql.includes("WHERE family_id = $1")),
    ).toBe(false);
    expect(
      query.mock.calls.some(([sql]) =>
        sql.includes("INSERT INTO auth_sessions"),
      ),
    ).toBe(false);
  });
});
