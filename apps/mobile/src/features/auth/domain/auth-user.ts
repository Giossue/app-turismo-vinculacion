import { z } from "zod";

import {
  legalDocumentTypes,
  type LegalDocumentType,
} from "@/features/legal/domain/legal-document";

export const authUserSchema = z.object({
  id: z.number().int().positive(),
  name: z.string().min(1),
  email: z.email(),
  roles: z.array(z.string()),
  // Sin el campo (API anterior, perfil guardado antes) el dato es desconocido.
  // Un valor ilegible cuenta igual: no debe impedir iniciar o restaurar sesión.
  pendingLegalDocuments: z
    .array(z.enum(legalDocumentTypes))
    .optional()
    .catch(undefined),
});

export type AuthUser = Readonly<z.infer<typeof authUserSchema>>;

export type AuthStatus = "loading" | "anonymous" | "authenticated";

const noPendingLegalDocuments: readonly LegalDocumentType[] = [];

/** Lo desconocido nunca bloquea: solo un pendiente confirmado por la API. */
export function getPendingLegalDocuments(
  status: AuthStatus,
  user: AuthUser | null,
): readonly LegalDocumentType[] {
  if (status !== "authenticated") return noPendingLegalDocuments;
  return user?.pendingLegalDocuments ?? noPendingLegalDocuments;
}
