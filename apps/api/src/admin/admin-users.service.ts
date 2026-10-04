import { Injectable } from "@nestjs/common";
import { InjectDataSource } from "@nestjs/typeorm";
import { DataSource } from "typeorm";

import type { AdminUsersQueryDto } from "./admin.dto";

type AdminUserRow = {
  id: string;
  name: string;
  email: string;
  roles: string[];
  active: boolean;
  createdAt: string;
};

@Injectable()
export class AdminUsersService {
  constructor(@InjectDataSource() private readonly dataSource: DataSource) {}

  async list(query: AdminUsersQueryDto) {
    const values: unknown[] = [];
    let where = "TRUE";
    if (query.q) {
      values.push(`%${query.q}%`);
      where = `(u.nombre ILIKE $1 OR u.email ILIKE $1 OR EXISTS (
        SELECT 1 FROM usuarios_roles ur
        JOIN roles r ON r.id = ur.rol_id
        WHERE ur.usuario_id = u.id AND r.nombre_rol ILIKE $1
      ))`;
    }

    const [countRows, items] = await Promise.all([
      this.dataSource.query(
        `SELECT COUNT(*)::int AS total FROM usuarios u WHERE ${where}`,
        values,
      ) as Promise<Array<{ total: number }>>,
      this.dataSource.query(
        `SELECT u.id::text AS id, u.nombre AS name, lower(u.email) AS email,
                COALESCE(array_agg(r.nombre_rol ORDER BY r.nombre_rol)
                  FILTER (WHERE r.nombre_rol IS NOT NULL), '{}') AS roles,
                u.activo AS active, u.created_at AS "createdAt"
           FROM usuarios u
           LEFT JOIN usuarios_roles ur ON ur.usuario_id = u.id
           LEFT JOIN roles r ON r.id = ur.rol_id
          WHERE ${where}
          GROUP BY u.id
          ORDER BY u.nombre ASC, u.id ASC
          LIMIT $${values.length + 1} OFFSET $${values.length + 2}`,
        [...values, query.limit, query.offset],
      ) as Promise<AdminUserRow[]>,
    ]);

    return {
      items,
      total: countRows[0]?.total ?? 0,
      limit: query.limit,
      offset: query.offset,
    };
  }
}
