import { Injectable } from "@nestjs/common";
import { InjectDataSource } from "@nestjs/typeorm";
import { DataSource } from "typeorm";

export const PLATFORM_SETTING_KEYS = {
  directCatastros: "publicacion_directa_catastros",
  directFichas: "publicacion_directa_fichas",
} as const;

export type PlatformSettings = {
  directPublishCatastros: boolean;
  directPublishFichas: boolean;
};

export type PlatformSettingsInput = Partial<PlatformSettings>;

@Injectable()
export class PlatformSettingsService {
  constructor(@InjectDataSource() private readonly dataSource: DataSource) {}

  async get(): Promise<PlatformSettings> {
    const rows = (await this.dataSource.query(
      "SELECT clave, valor_booleano AS value FROM configuracion_plataforma",
    )) as Array<{ clave: string; value: boolean }>;
    const enabled = (key: string) =>
      rows.some((row) => row.clave === key && row.value === true);
    return {
      directPublishCatastros: enabled(PLATFORM_SETTING_KEYS.directCatastros),
      directPublishFichas: enabled(PLATFORM_SETTING_KEYS.directFichas),
    };
  }

  async update(
    input: PlatformSettingsInput,
    actorId: number,
  ): Promise<PlatformSettings> {
    const changes: Array<[string, boolean]> = [];
    if (input.directPublishCatastros !== undefined)
      changes.push([
        PLATFORM_SETTING_KEYS.directCatastros,
        input.directPublishCatastros,
      ]);
    if (input.directPublishFichas !== undefined)
      changes.push([
        PLATFORM_SETTING_KEYS.directFichas,
        input.directPublishFichas,
      ]);
    for (const [key, value] of changes) {
      await this.dataSource.query(
        `INSERT INTO configuracion_plataforma (clave, valor_booleano, actualizado_por)
         VALUES ($1, $2, $3)
         ON CONFLICT (clave) DO UPDATE SET
           valor_booleano = EXCLUDED.valor_booleano,
           actualizado_por = EXCLUDED.actualizado_por,
           updated_at = CURRENT_TIMESTAMP`,
        [key, value, actorId],
      );
    }
    return this.get();
  }
}
