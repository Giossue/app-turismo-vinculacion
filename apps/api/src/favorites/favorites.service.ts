import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { InjectDataSource } from "@nestjs/typeorm";
import type { DataSource } from "typeorm";

import type { PublicCenter } from "../centers/domain/public-center";

type FavoriteCenterRow = Record<string, string | number | null>;

const publicCenterFields = `
  c.codigo_atractivo AS code,
  c.nombre AS name,
  c.descripcion AS description,
  c.latitud AS latitude,
  c.longitud AS longitude,
  ca.nombre AS category,
  ta.nombre AS type,
  sa.nombre AS subtype,
  rj.nombre AS hierarchy,
  ca.codigo AS category_code,
  ta.codigo AS type_code,
  sa.codigo AS subtype_code,
  p.codigo_dpa AS province_code,
  ct.codigo_cton AS canton_code,
  pa.codigo_pqa AS parish_code,
  rj.codigo AS hierarchy_code`;

const publicCenterJoins = `
  JOIN centros_turisticos c ON c.id = f.centro_turistico_id
  JOIN estados_resenia er ON er.id = c.estado_resenia_id
  JOIN subtipos_atractivo sa ON sa.id = c.subtipo_atractivo_id
  JOIN tipos_atractivo ta ON ta.id = sa.tipo_atractivo_id
  JOIN categorias_atractivo ca ON ca.id = ta.categoria_id
  JOIN parroquias pa ON pa.id = c.parroquia_id
  JOIN cantones ct ON ct.id = pa.canton_id
  JOIN provincias p ON p.id = ct.provincia_id
  LEFT JOIN rangos_jerarquia rj ON rj.id = c.jerarquia_id`;

@Injectable()
export class FavoritesService {
  constructor(@InjectDataSource() private readonly dataSource: DataSource) {}

  async listCenters(userId: number): Promise<readonly PublicCenter[]> {
    const rows = await this.dataSource.query<FavoriteCenterRow[]>(
      `SELECT ${publicCenterFields}, f.created_at AS saved_at
         FROM favoritos_centros f
         ${publicCenterJoins}
        WHERE f.usuario_id = $1
          AND c.activo
          AND er.codigo = 'PUBLICADO'
        ORDER BY f.created_at DESC, f.id DESC`,
      [userId],
    );
    return rows.map(toPublicCenter);
  }

  async addCenter(userId: number, code: string): Promise<PublicCenter> {
    const normalizedCode = this.normalizeCode(code);
    const centerRows = await this.dataSource.query<{ id: string }[]>(
      `SELECT c.id
         FROM centros_turisticos c
         JOIN estados_resenia er ON er.id = c.estado_resenia_id
        WHERE c.codigo_atractivo = $1
          AND c.activo
          AND er.codigo = 'PUBLICADO'
        LIMIT 1`,
      [normalizedCode],
    );
    const center = centerRows[0];
    if (!center) {
      throw new NotFoundException("El centro turístico ya no está disponible.");
    }

    await this.dataSource.query(
      `INSERT INTO favoritos_centros (usuario_id, centro_turistico_id)
       VALUES ($1, $2)
       ON CONFLICT (usuario_id, centro_turistico_id) DO NOTHING`,
      [userId, center.id],
    );

    const rows = await this.dataSource.query<FavoriteCenterRow[]>(
      `SELECT ${publicCenterFields}
         FROM favoritos_centros f
         ${publicCenterJoins}
        WHERE f.usuario_id = $1
          AND c.codigo_atractivo = $2
          AND c.activo
          AND er.codigo = 'PUBLICADO'
        LIMIT 1`,
      [userId, normalizedCode],
    );
    if (!rows[0]) {
      throw new NotFoundException("El centro turístico ya no está disponible.");
    }
    return toPublicCenter(rows[0]);
  }

  async removeCenter(
    userId: number,
    code: string,
  ): Promise<Readonly<{ removed: boolean }>> {
    const normalizedCode = this.normalizeCode(code);
    const rows = await this.dataSource.query<{ id: string }[]>(
      `DELETE FROM favoritos_centros f
             USING centros_turisticos c
        WHERE f.usuario_id = $1
          AND f.centro_turistico_id = c.id
          AND c.codigo_atractivo = $2
        RETURNING f.id`,
      [userId, normalizedCode],
    );
    return { removed: rows.length > 0 };
  }

  private normalizeCode(code: string): string {
    const normalized = code.trim();
    if (!normalized || normalized.length > 100) {
      throw new BadRequestException("El código del centro no es válido.");
    }
    return normalized;
  }
}

function toPublicCenter(row: FavoriteCenterRow): PublicCenter {
  return {
    code: required(row, "code"),
    name: required(row, "name"),
    description: nullable(row, "description"),
    latitude: number(row, "latitude"),
    longitude: number(row, "longitude"),
    category: required(row, "category"),
    type: required(row, "type"),
    subtype: required(row, "subtype"),
    hierarchy: nullable(row, "hierarchy"),
    categoryCode: required(row, "category_code"),
    typeCode: required(row, "type_code"),
    subtypeCode: required(row, "subtype_code"),
    provinceCode: required(row, "province_code"),
    cantonCode: required(row, "canton_code"),
    parishCode: required(row, "parish_code"),
    hierarchyCode: nullable(row, "hierarchy_code"),
  };
}

function required(row: FavoriteCenterRow, key: string): string {
  const value = row[key];
  if (typeof value !== "string" || !value) {
    throw new Error(`Dato público incompleto: ${key}`);
  }
  return value;
}

function nullable(row: FavoriteCenterRow, key: string): string | null {
  const value = row[key];
  if (value === null || value === undefined) return null;
  if (typeof value !== "string") {
    throw new Error(`Dato público inválido: ${key}`);
  }
  return value;
}

function number(row: FavoriteCenterRow, key: string): number {
  const value = row[key];
  const parsed = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(parsed)) {
    throw new Error(`Dato público inválido: ${key}`);
  }
  return parsed;
}
