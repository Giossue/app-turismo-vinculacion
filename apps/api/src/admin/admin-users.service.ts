import { Injectable } from "@nestjs/common";
import { InjectDataSource } from "@nestjs/typeorm";
import { DataSource } from "typeorm";

import { isTouristAccount } from "../auth/auth.types";
import { pendingLegalDocuments } from "../legal/legal-documents";
import type { LegalDocumentType } from "../legal/legal.types";
import type { AdminUsersQueryDto } from "./admin.dto";

type AdminUserRow = {
  id: string;
  name: string;
  email: string;
  roles: string[];
  active: boolean;
  createdAt: string;
};

type AcceptanceRow = {
  usuario_id: string;
  documento: string;
  version: string;
  aceptado_en: Date | string;
};

type LegalAcceptanceEntry = { version: string; acceptedAt: string };

type LegalAcceptanceState = {
  upToDate: boolean;
} & Record<LegalDocumentType, LegalAcceptanceEntry | null>;

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
      items: await this.withLegalAcceptance(items),
      total: countRows[0]?.total ?? 0,
      limit: query.limit,
      offset: query.offset,
    };
  }

  private async withLegalAcceptance(items: AdminUserRow[]) {
    const tourists = items.filter((item) => isTouristAccount(item.roles));
    const acceptances = tourists.length
      ? await this.dataSource.query<AcceptanceRow[]>(
          `SELECT usuario_id::text AS usuario_id, documento, version, aceptado_en
             FROM aceptaciones_legales
            WHERE usuario_id = ANY($1::bigint[])
            ORDER BY aceptado_en ASC, id ASC`,
          [tourists.map((item) => item.id)],
        )
      : [];

    return items.map((item) => ({
      ...item,
      legalAcceptance: isTouristAccount(item.roles)
        ? legalAcceptanceState(
            acceptances.filter((row) => row.usuario_id === item.id),
          )
        : null,
    }));
  }
}

/** Recibe las constancias en orden de aceptación: la última de cada documento gana. */
function legalAcceptanceState(rows: AcceptanceRow[]): LegalAcceptanceState {
  const latest = (type: LegalDocumentType): LegalAcceptanceEntry | null => {
    const row = rows.filter((item) => item.documento === type).at(-1);
    return row
      ? {
          version: row.version,
          acceptedAt: new Date(row.aceptado_en).toISOString(),
        }
      : null;
  };
  return {
    upToDate: pendingLegalDocuments(rows).length === 0,
    terms: latest("terms"),
    privacy: latest("privacy"),
  };
}
