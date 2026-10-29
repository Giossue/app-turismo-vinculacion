import { Injectable, Logger, NotFoundException } from "@nestjs/common";
import { InjectDataSource } from "@nestjs/typeorm";
import type { DataSource, EntityManager } from "typeorm";

import type {
  AgentResponse,
  AgentSource,
  AgentToolTrace,
} from "./ai-agent.contracts";

const DIAGNOSTIC_RETENTION_DAYS = 30;
const PURGE_INTERVAL_MS = 60 * 60 * 1_000;
const MAX_TRACE_ENTRIES = 12;
const TRACE_CONTENT_LIMIT = 4_000;

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
  private readonly logger = new Logger(AgentHistoryService.name);
  private lastPurge = 0;

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

  /**
   * Guarda cada turno para poder diagnosticarlo. Con historial activado el turno
   * es voluntario y se devuelve su id; sin él queda como registro interno
   * (`historial_voluntario = false`) que la persona no ve y que se purga solo.
   */
  async recordTurn(
    userId: number,
    publicId: string | undefined,
    question: string,
    answer: AgentResponse,
    trace: readonly AgentToolTrace[] = [],
  ): Promise<string | null> {
    const publicIdSaved = await this.dataSource.transaction(async (manager) => {
      const preferences = await manager.query<{ habilitado: boolean }[]>(
        `SELECT habilitado FROM preferencias_historial_ia
          WHERE usuario_id = $1 FOR UPDATE`,
        [userId],
      );
      const voluntary = preferences[0]?.habilitado === true;

      let conversation: { id: string; public_id: string };
      if (voluntary && publicId) {
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
        conversation = await this.insertConversation(
          manager,
          userId,
          voluntary,
        );
      }

      await this.insertMessage(
        manager,
        conversation.id,
        "USER",
        question,
        2_000,
      );
      await this.insertTrace(manager, conversation.id, trace);
      await this.insertMessage(
        manager,
        conversation.id,
        "ASSISTANT",
        answer.text,
        4_000,
        answer.sources,
      );
      await manager.query(
        `UPDATE conversaciones_ia SET updated_at = CURRENT_TIMESTAMP WHERE id = $1`,
        [conversation.id],
      );
      return voluntary ? conversation.public_id : null;
    });
    void this.purgeDiagnostics();
    return publicIdSaved;
  }

  /** Registro interno de un turno que terminó en error. Nunca lanza. */
  async recordFailure(
    userId: number,
    question: string,
    error: unknown,
    trace: readonly AgentToolTrace[] = [],
  ): Promise<void> {
    try {
      await this.dataSource.transaction(async (manager) => {
        const conversation = await this.insertConversation(
          manager,
          userId,
          false,
        );
        await this.insertMessage(
          manager,
          conversation.id,
          "USER",
          question,
          2_000,
        );
        await this.insertTrace(manager, conversation.id, trace);
        await this.insertMessage(
          manager,
          conversation.id,
          "SYSTEM",
          `ERROR: ${error instanceof Error ? error.message : String(error)}`,
          2_000,
        );
      });
      void this.purgeDiagnostics();
    } catch (saveError) {
      this.logger.warn(
        `Agent failure not recorded: ${saveError instanceof Error ? saveError.message : String(saveError)}`,
      );
    }
  }

  private async insertConversation(
    manager: EntityManager,
    userId: number,
    voluntary: boolean,
  ): Promise<{ id: string; public_id: string }> {
    const rows = await manager.query<{ id: string; public_id: string }[]>(
      `INSERT INTO conversaciones_ia (usuario_id, historial_voluntario)
       VALUES ($1, $2) RETURNING id, public_id`,
      [userId, voluntary],
    );
    return rows[0];
  }

  private async insertMessage(
    manager: EntityManager,
    conversationId: string,
    role: "USER" | "ASSISTANT" | "SYSTEM" | "TOOL",
    content: string,
    maxLength: number,
    sources?: readonly AgentSource[],
  ): Promise<void> {
    const safe = redactCoordinates(content).slice(0, maxLength);
    if (sources) {
      await manager.query(
        `INSERT INTO mensajes_ia
           (conversacion_id, rol_mensaje, contenido, fuentes_publicas)
         VALUES ($1, $2, $3, $4::jsonb)`,
        [conversationId, role, safe, JSON.stringify(sources)],
      );
      return;
    }
    await manager.query(
      `INSERT INTO mensajes_ia (conversacion_id, rol_mensaje, contenido)
       VALUES ($1, $2, $3)`,
      [conversationId, role, safe],
    );
  }

  private async insertTrace(
    manager: EntityManager,
    conversationId: string,
    trace: readonly AgentToolTrace[],
  ): Promise<void> {
    for (const entry of trace.slice(0, MAX_TRACE_ENTRIES)) {
      await this.insertMessage(
        manager,
        conversationId,
        "TOOL",
        JSON.stringify(entry),
        TRACE_CONTENT_LIMIT,
      );
    }
  }

  /** Borra los registros internos vencidos; como máximo una vez por hora. */
  private async purgeDiagnostics(): Promise<void> {
    const now = Date.now();
    if (now - this.lastPurge < PURGE_INTERVAL_MS) return;
    this.lastPurge = now;
    try {
      await this.dataSource.query(
        `DELETE FROM conversaciones_ia
          WHERE NOT historial_voluntario
            AND created_at < now() - ($1::int * interval '1 day')`,
        [DIAGNOSTIC_RETENTION_DAYS],
      );
    } catch (error) {
      this.logger.warn(
        `Agent diagnostics purge failed: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
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
