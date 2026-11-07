import { PRIVACY_2026_11_07 } from "./privacy-2026-11-07";
import { TERMS_2026_11_07 } from "./terms-2026-11-07";
import type { LegalDocument, LegalDocumentType } from "./legal.types";

/** Publicar una versión nueva es sustituir aquí el módulo y desplegar la API. */
export const CURRENT_LEGAL_DOCUMENTS: readonly LegalDocument[] = [
  TERMS_2026_11_07,
  PRIVACY_2026_11_07,
];

export interface LegalAcceptanceRecord {
  documento: string;
  version: string;
}

export function hasCurrentLegalVersion(
  type: LegalDocumentType,
  version: string,
): boolean {
  return CURRENT_LEGAL_DOCUMENTS.some(
    (document) => document.type === type && document.version === version,
  );
}

/** Documentos vigentes sin constancia en su versión vigente. */
export function pendingLegalDocuments(
  acceptances: readonly LegalAcceptanceRecord[],
): LegalDocumentType[] {
  return CURRENT_LEGAL_DOCUMENTS.filter(
    (document) =>
      !acceptances.some(
        (acceptance) =>
          acceptance.documento === document.type &&
          acceptance.version === document.version,
      ),
  ).map((document) => document.type);
}
