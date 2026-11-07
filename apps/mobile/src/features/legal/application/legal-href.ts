import type { Href } from "expo-router";

import type { LegalDocumentType } from "../domain/legal-document";

/** Ruta pública de un documento: se apila sobre el formulario sin desmontarlo. */
export function buildLegalDocumentHref(type: LegalDocumentType): Href {
  return `/legal/${type}` as Href;
}
