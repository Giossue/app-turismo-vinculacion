import { StyleSheet, View } from "react-native";

import { TourismActionButton } from "@/core/ui/tourism-controls";
import { TourismCheckbox, TourismFieldError } from "@/core/ui/tourism-fields";
import { TourismStateView } from "@/core/ui/tourism-state";
import { turismoSpacing } from "@/core/ui/tokens";
import { useMessages } from "@/core/i18n/use-language";
import type { LegalDocumentsState } from "../application/use-legal-documents";
import {
  isLegalDocumentAccepted,
  setLegalConsent,
  type LegalConsent,
} from "../domain/legal-consent";
import {
  findLegalDocument,
  type LegalDocumentType,
} from "../domain/legal-document";

/**
 * Una casilla por documento con su enlace de lectura. Sin documentos cargados
 * no hay casillas, de modo que no se puede aceptar un texto que no se mostró.
 */
export function LegalConsentFields({
  consent,
  disabled = false,
  error,
  legal,
  onChange,
  onOpenDocument,
  types,
}: Readonly<{
  consent: LegalConsent;
  disabled?: boolean;
  error?: string | null;
  legal: LegalDocumentsState;
  onChange: (consent: LegalConsent) => void;
  onOpenDocument: (type: LegalDocumentType) => void;
  types: readonly LegalDocumentType[];
}>) {
  const m = useMessages();
  const text = m.account.legal;

  if (!legal.documents) {
    return legal.failed ? (
      <TourismStateView
        actionPending={legal.retrying}
        layout="card"
        message={text.loadError}
        onAction={legal.retry}
        variant="error"
      />
    ) : (
      <TourismStateView
        layout="inline"
        message={text.loading}
        variant="loading"
      />
    );
  }

  return (
    <View style={styles.fields}>
      {types.map((type) => {
        const document = findLegalDocument(legal.documents, type);
        if (!document) return null;
        return (
          <View key={type} style={styles.row}>
            <View style={styles.checkbox}>
              <TourismCheckbox
                checked={isLegalDocumentAccepted(consent, document)}
                disabled={disabled}
                label={text.accept[type]}
                onChange={(checked) =>
                  onChange(setLegalConsent(consent, document, checked))
                }
              />
            </View>
            <TourismActionButton
              accessibilityLabel={text.readDocument(text.documents[type])}
              label={text.read}
              mode="ghost"
              onPress={() => onOpenDocument(type)}
            />
          </View>
        );
      })}
      {error ? <TourismFieldError message={error} /> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  fields: { gap: turismoSpacing.xs },
  row: { alignItems: "center", flexDirection: "row", gap: turismoSpacing.xs },
  checkbox: { flex: 1 },
});
