import { Readable } from "node:stream";

import ExcelJS from "exceljs";

/** Estados del registro MINTUR que guarda `estado_registro_mintur`. */
export type MinturRegistryStatus =
  | "RATIFICADO"
  | "PENDIENTE_INSPECCION"
  | "SUSPENSION_TEMPORAL"
  | "SUSPENSION_DEFINITIVA"
  | "INACTIVO";

export type MinturRegistryRow = {
  sheet: string;
  rowNumber: number;
  numeroRegistro: string;
  ruc: string | null;
  codigoEstablecimientoRuc: string | null;
  nombreComercial: string;
  razonSocial: string | null;
  actividad: string;
  clasificacion: string | null;
  categoria: string | null;
  provincia: string;
  canton: string;
  parroquia: string | null;
  direccion: string | null;
  referenciaDireccion: string | null;
  telefono: string | null;
  telefonoSecundario: string | null;
  correo: string | null;
  sitioWeb: string | null;
  latitude: number | null;
  longitude: number | null;
  estadoRegistro: MinturRegistryStatus | null;
  fechaRegistro: string | null;
  totalTrabajadores: number | null;
  totalHabitaciones: number | null;
  totalCamas: number | null;
  totalPlazas: number | null;
  totalMesas: number | null;
  capacidadPersonas: number | null;
  /** Fila original completa: encabezado → valor de texto. */
  raw: Record<string, string>;
};

export type MinturRegistryRowError = {
  sheet: string;
  rowNumber: number;
  numeroRegistro: string | null;
  reason: string;
};

export type MinturRegistryParseResult = {
  rows: MinturRegistryRow[];
  errors: MinturRegistryRowError[];
  sheets: string[];
};

/** Límite defensivo: el consolidado nacional tiene unas 50.000 filas. */
export const MINTUR_REGISTRY_MAX_ROWS = 200_000;
const MAX_CELL_LENGTH = 2_000;

const REQUIRED_HEADERS = {
  numeroRegistro: "numero de registro",
  nombreComercial: "nombre comercial",
  actividad: "actividad / modalidad",
  provincia: "provincia",
  canton: "canton",
} as const;

const OPTIONAL_HEADERS = {
  ruc: "ruc",
  codigoEstablecimientoRuc: "codigo de establecimiento ruc",
  razonSocial: "razon social (propietario)",
  clasificacion: "clasificacion",
  categoria: "categoria",
  parroquia: "parroquia",
  direccion: "direccion",
  referenciaDireccion: "referencia de direccion",
  telefono: "telefono principal",
  telefonoSecundario: "telefono secundario",
  correo: "correo electronico",
  sitioWeb: "direccion web",
  latitude: "latitud",
  longitude: "longitud",
  estadoRegistro: "estado registro del establecimiento",
  fechaRegistro: "fecha de registro",
  totalTrabajadores: "total trabajadores",
  totalHabitaciones: "total habitaciones / tiendas de campana",
  totalCamas: "total camas",
  totalPlazas: "total plazas",
  totalMesas: "total de mesas",
  capacidadPersonas: "total capacidades en numero de personas",
} as const;

type HeaderKey = keyof typeof REQUIRED_HEADERS | keyof typeof OPTIONAL_HEADERS;

const STATUS_BY_TEXT: Record<string, MinturRegistryStatus> = {
  ratificado: "RATIFICADO",
  "pendiente de inspeccion": "PENDIENTE_INSPECCION",
  "suspension temporal": "SUSPENSION_TEMPORAL",
  "suspension definitiva": "SUSPENSION_DEFINITIVA",
  inactivo: "INACTIVO",
};

/** Los registros ratificados o por inspeccionar siguen operando. */
export function isOperatingStatus(status: MinturRegistryStatus | null) {
  return (
    status === null ||
    status === "RATIFICADO" ||
    status === "PENDIENTE_INSPECCION"
  );
}

export function normalizeText(value: string | null | undefined) {
  return (value ?? "")
    .trim()
    .toLocaleLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/\s+/g, " ");
}

/**
 * Lee las hojas del consolidado que tienen los encabezados del catastro; omite
 * tablas dinámicas y hojas auxiliares. Usa el lector por streaming de ExcelJS
 * para no cargar el libro completo en memoria.
 */
export async function parseMinturRegistry(
  file: Buffer,
): Promise<MinturRegistryParseResult> {
  const reader = new ExcelJS.stream.xlsx.WorkbookReader(Readable.from(file), {
    sharedStrings: "cache",
    hyperlinks: "ignore",
    styles: "cache",
    worksheets: "emit",
    entries: "emit",
  });
  const result: MinturRegistryParseResult = {
    rows: [],
    errors: [],
    sheets: [],
  };
  let total = 0;
  for await (const worksheet of reader) {
    const sheetName =
      (worksheet as unknown as { name?: string }).name ?? "Hoja";
    let columns: Map<HeaderKey, number> | null = null;
    let headers: string[] = [];
    for await (const row of worksheet as AsyncIterable<ExcelJS.Row>) {
      const values = (row.values as unknown[]).slice(1).map(cellText);
      if (!columns) {
        // Solo la primera fila puede ser encabezado; si no lo es, la hoja no
        // pertenece al catastro y se ignora completa.
        columns = headerColumns(values);
        if (!columns) break;
        headers = values;
        result.sheets.push(sheetName);
        continue;
      }
      if (values.every((value) => !value)) continue;
      total += 1;
      if (total > MINTUR_REGISTRY_MAX_ROWS) {
        throw new Error(
          `El archivo supera el máximo de ${MINTUR_REGISTRY_MAX_ROWS} filas.`,
        );
      }
      const parsed = parseRow(sheetName, row.number, headers, columns, values);
      if ("reason" in parsed) result.errors.push(parsed);
      else result.rows.push(parsed);
    }
  }
  return result;
}

function headerColumns(values: string[]) {
  const byName = new Map<string, number>();
  values.forEach((value, index) => {
    const key = normalizeText(value);
    if (key && !byName.has(key)) byName.set(key, index);
  });
  const columns = new Map<HeaderKey, number>();
  for (const [key, header] of Object.entries(REQUIRED_HEADERS)) {
    const index = byName.get(header);
    if (index === undefined) return null;
    columns.set(key as HeaderKey, index);
  }
  for (const [key, header] of Object.entries(OPTIONAL_HEADERS)) {
    const index = byName.get(header);
    if (index !== undefined) columns.set(key as HeaderKey, index);
  }
  return columns;
}

export function parseRow(
  sheet: string,
  rowNumber: number,
  headers: string[],
  columns: Map<HeaderKey, number>,
  values: string[],
): MinturRegistryRow | MinturRegistryRowError {
  const text = (key: HeaderKey, max?: number) => {
    const index = columns.get(key);
    const value = index === undefined ? "" : (values[index] ?? "").trim();
    if (!value) return null;
    return max ? value.slice(0, max) : value;
  };
  const numeroRegistro = text("numeroRegistro");
  const fail = (reason: string): MinturRegistryRowError => ({
    sheet,
    rowNumber,
    numeroRegistro,
    reason,
  });
  if (!numeroRegistro) return fail("No tiene número de registro.");
  if (numeroRegistro.length > 40)
    return fail("El número de registro es demasiado largo.");
  // Algunos registros solo tienen razón social; se usa como nombre visible.
  const nombreComercial =
    text("nombreComercial", 180) ?? text("razonSocial", 180);
  if (!nombreComercial)
    return fail("No tiene nombre comercial ni razón social.");
  const actividad = text("actividad");
  if (!actividad) return fail("No tiene actividad.");
  const provincia = text("provincia");
  const canton = text("canton");
  if (!provincia || !canton) return fail("No tiene provincia o cantón.");

  const raw: Record<string, string> = {};
  headers.forEach((header, index) => {
    const value = values[index];
    if (header && value) raw[header] = value;
  });

  return {
    sheet,
    rowNumber,
    numeroRegistro,
    ruc: digits(text("ruc"), 13),
    codigoEstablecimientoRuc: text("codigoEstablecimientoRuc", 10),
    nombreComercial,
    razonSocial: text("razonSocial", 200),
    actividad,
    clasificacion: text("clasificacion"),
    categoria: text("categoria"),
    provincia,
    canton,
    parroquia: text("parroquia"),
    direccion: text("direccion"),
    referenciaDireccion: text("referenciaDireccion"),
    telefono: phone(text("telefono")),
    telefonoSecundario: phone(text("telefonoSecundario")),
    correo: email(text("correo")),
    sitioWeb: text("sitioWeb", 300),
    latitude: decimal(text("latitude")),
    longitude: decimal(text("longitude")),
    estadoRegistro:
      STATUS_BY_TEXT[normalizeText(text("estadoRegistro"))] ?? null,
    fechaRegistro: isoDate(text("fechaRegistro")),
    totalTrabajadores: count(text("totalTrabajadores")),
    totalHabitaciones: count(text("totalHabitaciones")),
    totalCamas: count(text("totalCamas")),
    totalPlazas: count(text("totalPlazas")),
    totalMesas: count(text("totalMesas")),
    capacidadPersonas: count(text("capacidadPersonas")),
    raw,
  };
}

/** Convierte cualquier celda de ExcelJS en texto plano. */
export function cellText(value: unknown): string {
  if (value === null || value === undefined) return "";
  if (value instanceof Date) {
    return Number.isNaN(value.getTime())
      ? ""
      : value.toISOString().slice(0, 10);
  }
  if (typeof value === "object") {
    const cell = value as {
      richText?: Array<{ text?: string }>;
      text?: unknown;
      result?: unknown;
      error?: unknown;
    };
    if (Array.isArray(cell.richText)) {
      return clip(cell.richText.map((part) => part.text ?? "").join(""));
    }
    if (cell.text !== undefined) return cellText(cell.text);
    if (cell.result !== undefined) return cellText(cell.result);
    return "";
  }
  return clip(String(value));
}

function clip(value: string) {
  return value.trim().slice(0, MAX_CELL_LENGTH);
}

function digits(value: string | null, length: number) {
  const clean = value?.replace(/\D/g, "") ?? "";
  return clean && clean.length <= length ? clean : null;
}

function phone(value: string | null) {
  const clean = value?.replace(/[^\d+]/g, "") ?? "";
  // El consolidado usa "0" para teléfonos desconocidos.
  if (!/\d{6,}/.test(clean)) return null;
  return clean.slice(0, 25);
}

function email(value: string | null) {
  const clean = value?.trim().toLowerCase() ?? "";
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(clean) && clean.length <= 254
    ? clean
    : null;
}

function decimal(value: string | null) {
  if (!value) return null;
  const number = Number(value.replace(",", "."));
  return Number.isFinite(number) && number !== 0 ? number : null;
}

function count(value: string | null) {
  if (!value) return null;
  const number = Number(value);
  return Number.isSafeInteger(number) && number >= 0 && number <= 1_000_000
    ? number
    : null;
}

function isoDate(value: string | null) {
  return value && /^\d{4}-\d{2}-\d{2}$/.test(value) ? value : null;
}
