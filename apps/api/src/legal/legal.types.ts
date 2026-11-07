export const LEGAL_DOCUMENT_TYPES = ["terms", "privacy"] as const;

export type LegalDocumentType = (typeof LEGAL_DOCUMENT_TYPES)[number];

export interface LegalDocumentSection {
  heading: string;
  /** Texto plano; los párrafos se separan con una línea en blanco. */
  body: string;
}

export interface LegalDocument {
  type: LegalDocumentType;
  version: string;
  title: string;
  publishedAt: string;
  sections: readonly LegalDocumentSection[];
}
