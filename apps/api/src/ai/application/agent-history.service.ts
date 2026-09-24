import { Injectable, NotFoundException } from "@nestjs/common";
import { InjectDataSource } from "@nestjs/typeorm";
import type { DataSource } from "typeorm";

import type { AgentResponse, AgentSource } from "./ai-agent.contracts";

type ConversationRow = {
  id: string;
  public_id: string;
  created_at: Date | string;
  updated_at: Date | string;
  title: string | null;
};

type MessageRow = {
  role: "USER" | "ASSISTANT";
  content: string;
  sources: AgentSource[] | null;
  created_at: Date | string;
};

export type AgentHistoryConversation = Readonly<{
  id: string;
  title: string;
  createdAt: string;
  updatedAt: string;
}>;

@Injectable()
export class AgentHistoryService {
  constructor(@InjectDataSource() private readonly dataSource: DataSource) {}

  async enabled(userId: number): Promise<boolean> {
    const rows = await this.dataSource.query<{ habilitado: boolean }[]>(
      `SELECT habilitado FROM preferencias_historial_ia WHERE usuario_id = $1`,
      [userId],
    );
    return rows[0]?.habilitado === true;
  }

  async setEnabled(userId: number, enabled: boolean): Promise<boolean> {
    await this.dataSource.transaction(async (manager) => {
      await manager.query(
        `INSERT INTO preferencias_historial_ia (usuario_id, habilitado)
         VALUES ($1, $2)
         ON CONFLICT (usuario_id) DO UPDATE
           SET habilitado = EXCLUDED.habilitado, updated_at = CURRENT_TIMESTAMP`,
        [userId, enabled],
      );
      if (!enabled) {
        await manager.query(
          `DELETE FROM conversaciones_ia
            WHERE usuario_id = $1 AND historial_voluntario`,
          [userId],
        );
      }
    });
    return enabled;
  }

  async list(userId: number): Promise<readonly AgentHistoryConversation[]> {
    const rows = await this.dataSource.query<ConversationRow[]>(
      `SELECT c.public_id, c.created_at, c.updated_at,
              (SELECT left(m.contenido, 120)
                 FROM mensajes_ia m
                WHERE m.conversacion_id = c.id AND m.rol_mensaje = 'USER'
                ORDER BY m.id LIMIT 1) AS title
         FROM conversaciones_ia c
        WHERE c.usuario_id = $1 AND c.historial_voluntario
        ORDER BY c.updated_at DESC, c.id DESC
        LIMIT 50`,
      [userId],
    );
    return rows.map(toConversation);
  }

  async get(userId: number, publicId: string) {
    const rows = await this.dataSource.query<ConversationRow[]>(
      `SELECT c.id, c.public_id, c.created_at, c.updated_at,
              (SELECT left(m.contenido, 120)
                 FROM mensajes_ia m
                WHERE m.conversacion_id = c.id AND m.rol_mensaje = 'USER'
                ORDER BY m.id LIMIT 1) AS title
         FROM conversaciones_ia c
        WHERE c.public_id = $1 AND c.usuario_id = $2 AND c.historial_voluntario`,
      [publicId, userId],
    );
    const row = rows[0];
    if (!row)
      throw new NotFoundException("La conversación no está disponible.");
    const messages = await this.dataSource.query<MessageRow[]>(
      `SELECT rol_mensaje AS role, contenido AS content,
              fuentes_publicas AS sources, created_at
         FROM mensajes_ia
        WHERE conversacion_id = $1 AND rol_mensaje IN ('USER', 'ASSISTANT')
        ORDER BY id ASC
        LIMIT 100`,
      [row.id],
    );
    return {
      ...toConversation(row),
      messages: messages.map((message) => ({
        role:
          message.role === "USER" ? ("user" as const) : ("assistant" as const),
        text: message.content,
        sources: message.sources ?? [],
        createdAt: new Date(message.created_at).toISOString(),
      })),
    };
  }

  async remove(
    userId: number,
    publicId: string,
  ): Promise<{ removed: boolean }> {
    const rows = await this.dataSource.query<{ id: string }[]>(
      `DELETE FROM conversaciones_ia
        WHERE public_id = $1 AND usuario_id = $2 AND historial_voluntario
        RETURNING id`,
      [publicId, userId],
    );
    return { removed: rows.length > 0 };
  }

  async recordTurn(
    userId: number,
    publicId: string | undefined,
    question: string,
    answer: AgentResponse,
  ): Promise<string | null> {
    return this.dataSource.transaction(async (manager) => {
      const preferences = await manager.query<{ habilitado: boolean }[]>(
        `SELECT habilitado FROM preferencias_historial_ia
          WHERE usuario_id = $1 FOR UPDATE`,
        [userId],
      );
      if (preferences[0]?.habilitado !== true) return null;

      let conversation: { id: string; public_id: string };
      if (publicId) {
        const rows = await manager.query<{ id: string; public_id: string }[]>(
          `SELECT id, public_id FROM conversaciones_ia
            WHERE public_id = $1 AND usuario_id = $2 AND historial_voluntario
            FOR UPDATE`,
          [publicId, userId],
        );
        if (!rows[0])
          throw new NotFoundException("La conversación no está disponible.");
        conversation = rows[0];
      } else {
        const rows = await manager.query<{ id: string; public_id: string }[]>(
          `INSERT INTO conversaciones_ia (usuario_id, historial_voluntario)
           VALUES ($1, TRUE) RETURNING id, public_id`,
          [userId],
        );
        conversation = rows[0];
      }

      const safeQuestion = redactCoordinates(question).slice(0, 2_000);
      const safeAnswer = redactCoordinates(answer.text).slice(0, 4_000);
      await manager.query(
        `INSERT INTO mensajes_ia (conversacion_id, rol_mensaje, contenido)
         VALUES ($1, 'USER', $2)`,
        [conversation.id, safeQuestion],
      );
      await manager.query(
        `INSERT INTO mensajes_ia
           (conversacion_id, rol_mensaje, contenido, fuentes_publicas)
         VALUES ($1, 'ASSISTANT', $2, $3::jsonb)`,
        [conversation.id, safeAnswer, JSON.stringify(answer.sources)],
      );
      await manager.query(
        `UPDATE conversaciones_ia SET updated_at = CURRENT_TIMESTAMP WHERE id = $1`,
        [conversation.id],
      );
      return conversation.public_id;
    });
  }
}

function toConversation(row: ConversationRow): AgentHistoryConversation {
  return {
    id: row.public_id,
    title: row.title || "Conversación sin título",
    createdAt: new Date(row.created_at).toISOString(),
    updatedAt: new Date(row.updated_at).toISOString(),
  };
}

function redactCoordinates(text: string): string {
  return text
    .replace(
      /\b(?:lat(?:itud)?|lon(?:gitud)?|lng)\s*[:=]\s*[-+]?\d{1,3}(?:[.,]\d{2,})/gi,
      "[ubicación omitida]",
    )
    .replace(
      /(?<![\dA-Za-z])[-+]?\d{1,2}(?:[.,]\d{2,})\s*(?:[,;]\s*|\s+)[-+]?\d{1,3}(?:[.,]\d{2,})(?!\d)/g,
      "[ubicación omitida]",
    );
}
