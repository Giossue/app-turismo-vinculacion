import {
  findLegalDocument,
  type LegalDocument,
  type LegalDocumentType,
} from "./legal-document";

/** Versión mostrada de cada documento cuya casilla está marcada. */
export type LegalConsent = Readonly<Partial<Record<LegalDocumentType, string>>>;

export const noLegalConsent: LegalConsent = {};

export function setLegalConsent(
  consent: LegalConsent,
  document: LegalDocument,
  checked: boolean,
): LegalConsent {
  const { [document.type]: _previous, ...others } = consent;
  return checked ? { ...others, [document.type]: document.version } : others;
}

/**
 * La casilla guarda la versión que la persona tenía delante: si una recarga
 * trae otra, esa aceptación deja de valer y la casilla vuelve a verse vacía.
 */
export function isLegalDocumentAccepted(
  consent: LegalConsent,
  document: LegalDocument,
): boolean {
  return consent[document.type] === document.version;
}

/**
 * Versiones listas para enviar, o `null` mientras falte un documento por cargar
 * o por aceptar. Es la única condición que habilita aceptar y crear la cuenta.
 */
export function getAcceptedVersions(
  consent: LegalConsent,
  documents: readonly LegalDocument[] | null,
  required: readonly LegalDocumentType[],
): LegalConsent | null {
  if (required.length === 0) return null;
  const accepted: Partial<Record<LegalDocumentType, string>> = {};
  for (const type of required) {
    const document = findLegalDocument(documents, type);
    if (!document || !isLegalDocumentAccepted(consent, document)) return null;
    accepted[type] = document.version;
  }
  return accepted;
}
