import { Injectable, NotFoundException } from "@nestjs/common";
import { InjectDataSource } from "@nestjs/typeorm";
import type { DataSource, EntityManager } from "typeorm";
import { z } from "zod";

export const savedItineraryInputSchema = z
  .object({
    title: z.string().trim().min(1).max(160),
    summary: z.string().trim().min(1).max(500),
    days: z
      .array(
        z
          .object({
            date: z.iso.date().nullable(),
            stops: z
              .array(z.string().trim().length(17))
              .min(1)
              .max(6)
              .refine((codes) => new Set(codes).size === codes.length),
          })
          .strict(),
      )
      .min(1)
      .max(7)
      .refine(
        (days) => days.reduce((count, day) => count + day.stops.length, 0) >= 2,
      ),
  })
  .strict();

export type SavedItineraryInput = z.infer<typeof savedItineraryInputSchema>;

type PlanRow = {
  id: string;
  title: string;
  summary: string;
  created_at: Date | string;
  updated_at: Date | string;
};

type StopRow = {
  day_order: number;
  day_date: string | null;
  stop_order: number;
  code: string;
  name: string;
};

export type SavedItinerary = Readonly<{
  id: string;
  title: string;
  summary: string;
  days: readonly Readonly<{
    date: string | null;
    stops: readonly Readonly<{ code: string; name: string }>[];
  }>[];
  createdAt: string;
  updatedAt: string;
}>;

@Injectable()
export class AgentItinerariesService {
  constructor(@InjectDataSource() private readonly dataSource: DataSource) {}

  async list(userId: number): Promise<readonly SavedItinerary[]> {
    const rows = await this.dataSource.query<PlanRow[]>(
      `SELECT id, titulo AS title, resumen AS summary, created_at, updated_at
         FROM itinerarios_usuario
        WHERE usuario_id = $1
        ORDER BY updated_at DESC, id
        LIMIT 50`,
      [userId],
    );
    return Promise.all(rows.map((row) => this.withStops(row, this.dataSource)));
  }

  async get(userId: number, id: string): Promise<SavedItinerary> {
    const rows = await this.dataSource.query<PlanRow[]>(
      `SELECT id, titulo AS title, resumen AS summary, created_at, updated_at
         FROM itinerarios_usuario
        WHERE id = $1 AND usuario_id = $2`,
      [id, userId],
    );
    if (!rows[0]) throw new NotFoundException("El plan no está disponible.");
    return this.withStops(rows[0], this.dataSource);
  }

  async create(
    userId: number,
    input: SavedItineraryInput,
  ): Promise<SavedItinerary> {
    return this.dataSource.transaction(async (manager) => {
      await this.assertPublishedCenters(manager, input);
      const rows = await manager.query<PlanRow[]>(
        `INSERT INTO itinerarios_usuario (usuario_id, titulo, resumen)
         VALUES ($1, $2, $3)
         RETURNING id, titulo AS title, resumen AS summary, created_at, updated_at`,
        [userId, input.title, input.summary],
      );
      await this.replaceDays(manager, rows[0].id, input.days);
      return this.withStops(rows[0], manager);
    });
  }

  async update(
    userId: number,
    id: string,
    input: SavedItineraryInput,
  ): Promise<SavedItinerary> {
    return this.dataSource.transaction(async (manager) => {
      const rows = await manager.query<PlanRow[]>(
        `SELECT id, titulo AS title, resumen AS summary, created_at, updated_at
           FROM itinerarios_usuario
          WHERE id = $1 AND usuario_id = $2
          FOR UPDATE`,
        [id, userId],
      );
      if (!rows[0]) throw new NotFoundException("El plan no está disponible.");
      await this.assertPublishedCenters(manager, input);
      await manager.query(
        `DELETE FROM itinerario_jornadas WHERE itinerario_id = $1`,
        [id],
      );
      const updated = await manager.query<PlanRow[]>(
        `UPDATE itinerarios_usuario
            SET titulo = $3, resumen = $4, updated_at = CURRENT_TIMESTAMP
          WHERE id = $1 AND usuario_id = $2
        RETURNING id, titulo AS title, resumen AS summary, created_at, updated_at`,
        [id, userId, input.title, input.summary],
      );
      await this.replaceDays(manager, id, input.days);
      return this.withStops(updated[0], manager);
    });
  }

  async remove(userId: number, id: string): Promise<{ removed: boolean }> {
    const rows = await this.dataSource.query<{ id: string }[]>(
      `DELETE FROM itinerarios_usuario WHERE id = $1 AND usuario_id = $2 RETURNING id`,
      [id, userId],
    );
    return { removed: rows.length > 0 };
  }

  private async assertPublishedCenters(
    manager: EntityManager,
    input: SavedItineraryInput,
  ) {
    const codes = [...new Set(input.days.flatMap((day) => day.stops))];
    const rows = await manager.query<{ code: string }[]>(
      `SELECT btrim(c.codigo_atractivo) AS code
         FROM centros_turisticos c
         JOIN estados_resenia e ON e.id = c.estado_resenia_id
        WHERE c.codigo_atractivo = ANY($1::text[])
          AND c.activo AND e.codigo = 'PUBLICADO'`,
      [codes],
    );
    if (rows.length !== codes.length) {
      throw new NotFoundException("Una parada ya no está publicada.");
    }
  }

  private async replaceDays(
    manager: EntityManager,
    id: string,
    days: SavedItineraryInput["days"],
  ) {
    for (const [dayIndex, day] of days.entries()) {
      const rows = await manager.query<{ id: string }[]>(
        `INSERT INTO itinerario_jornadas (itinerario_id, orden, fecha)
         VALUES ($1, $2, $3) RETURNING id`,
        [id, dayIndex + 1, day.date],
      );
      for (const [stopIndex, code] of day.stops.entries()) {
        await manager.query(
          `INSERT INTO itinerario_paradas (jornada_id, centro_turistico_id, orden)
           SELECT $1, c.id, $3
             FROM centros_turisticos c
            WHERE c.codigo_atractivo = $2`,
          [rows[0].id, code, stopIndex + 1],
        );
      }
    }
  }

  private async withStops(
    row: PlanRow,
    manager: DataSource | EntityManager,
  ): Promise<SavedItinerary> {
    const stops = await manager.query<StopRow[]>(
      `SELECT j.orden AS day_order, j.fecha::text AS day_date,
              p.orden AS stop_order, btrim(c.codigo_atractivo) AS code, c.nombre AS name
         FROM itinerario_jornadas j
         JOIN itinerario_paradas p ON p.jornada_id = j.id
         JOIN centros_turisticos c ON c.id = p.centro_turistico_id
        WHERE j.itinerario_id = $1
        ORDER BY j.orden, p.orden`,
      [row.id],
    );
    const days: Array<{
      date: string | null;
      stops: Array<{ code: string; name: string }>;
    }> = [];
    for (const stop of stops) {
      const index = Number(stop.day_order) - 1;
      days[index] ??= { date: stop.day_date, stops: [] };
      days[index].stops.push({ code: stop.code, name: stop.name });
    }
    return {
      id: row.id,
      title: row.title,
      summary: row.summary,
      days,
      createdAt: new Date(row.created_at).toISOString(),
      updatedAt: new Date(row.updated_at).toISOString(),
    };
  }
}
