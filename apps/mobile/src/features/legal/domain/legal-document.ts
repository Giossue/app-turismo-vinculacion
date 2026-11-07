import { z } from "zod";

export const legalDocumentTypes = ["terms", "privacy"] as const;

export type LegalDocumentType = (typeof legalDocumentTypes)[number];

export const legalDocumentSchema = z.object({
  type: z.enum(legalDocumentTypes),
  version: z.string().min(1),
  title: z.string().min(1),
  publishedAt: z.string(),
  sections: z.array(z.object({ heading: z.string(), body: z.string() })),
});

export type LegalDocument = Readonly<z.infer<typeof legalDocumentSchema>>;

export function findLegalDocument(
  documents: readonly LegalDocument[] | null,
  type: LegalDocumentType,
): LegalDocument | null {
  return documents?.find((document) => document.type === type) ?? null;
}

/** El parámetro de la ruta viene de fuera: solo se aceptan los tipos conocidos. */
export function parseLegalDocumentType(
  value: string | undefined,
): LegalDocumentType | null {
  return legalDocumentTypes.find((type) => type === value) ?? null;
}

/** El cuerpo llega como texto plano con los párrafos separados por `\n\n`. */
export function splitLegalParagraphs(body: string): readonly string[] {
  return body
    .split(/\n{2,}/)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean);
}

/**
 * Una fecha sin hora se lee como día local: `new Date` la interpretaría en UTC
 * y en Ecuador mostraría el día anterior.
 */
export function parseLegalPublishedAt(value: string): Date | null {
  const day = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  const date = day
    ? new Date(Number(day[1]), Number(day[2]) - 1, Number(day[3]))
    : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}
